/**
 * Model for the Notifications
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module notifier
 */

import prefs from '../preferences';
import LiveState from "./channel/live-state";
import { and, or, not } from './logic';
import { emit } from '../utils';
import EventTarget from 'event-target-shim';

const _ = browser.i18n.getMessage,

    /**
     * Size of the image shown in the notification.
     * @const {number}
     * @default 100
     */
    NOTIFICATION_ICON_SIZE = 100;

/**
 * @class module:notifier.Notifier
 * @extends external:EventTarget
 */
export default class Notifier extends EventTarget {
    /**
     * @constructs
     */
    constructor() {
        super();
        /**
         * The last title of each channel by id the notifier last saw.
         *
         * @type {Map.<number, string>}
         */
        this.channelTitles = new Map();
        /**
         * Proprietary thing I'm too tired to explain, but it stores the relevant
         * info about a channel's current state.
         *
         * @type {Map.<number, object>}
         */
        this.channelStates = new Map();
        browser.notifications.onClicked.addListener((id) => {
            if(id.startsWith("cn")) {
                emit(this, "click", parseInt(id.substr(2), 10));
            }
        });
    }

    /**
     * If online notifications should be shown.
     *
     * @returns {boolean} Show online notifications when true.
     * @async
     */
    onlineNotifications() {
        return prefs.get("onlineNotification");
    }
    /**
     * If title change notifications should be shown.
     *
     * @returns {boolean} Show title change notifications when true.
     * @async
     */
    titleNotifications() {
        return prefs.get("titleChangeNotification");
    }
    /**
     * If offline notifications should be shown.
     *
     * @returns {boolean} Show offline notifications when true.
     * @async
     */
    offlineNotifications() {
        return prefs.get("offlineNotification");
    }
    /**
     * If non-live types are handled like a non-binary state, they get custom
     * notifications when this is set.
     *
     * @returns {boolean} Show non-live notifications when true.
     * @async
     */
    nonliveNotifications() {
        return prefs.get("nonliveNotification");
    }
    /**
     * If any notifications are to be shown.
     *
     * @returns {boolean} Can show notifications when true.
     * @async
     */
    showNotifications() {
        return or(
            this.onlineNotifications(),
            this.titleNotifications(),
            this.offlineNotifications(),
            this.nonliveNotifications()
        );
    }
    /**
     * Store a channel's state.
     *
     * @param {module:channel/core.Channel} channel - The channel to store.
     * @returns {undefined}
     */
    _setChannelState(channel) {
        this.channelStates.set(channel.id, {
            state: channel.live.state,
            user: channel.live.alternateUsername
        });
    }
    /**
     * Determine if the state of a channel has changed.
     *
     * @param {module:channel/core.Channel} channel - The channel that might
     *                                                have changed.
     * @returns {boolean} When true the channel state changed.
     */
    _channelStateChanged(channel) {
        const oldState = this.channelStates.get(channel.id);
        return oldState === undefined || oldState.state != channel.live.state || (channel.live.state > LiveState.LIVE && oldState.user != channel.live.alternateUsername);
    }
    async _getLiveInterpretation() {
        if(await this.nonliveNotifications()) {
            return LiveState.TOWARD_LIVE;
        }
        else {
            return LiveState.TOWARD_OFFLINE;
        }
    }
    /**
     * Show a notification to the user, if the channel isn't in the currently
     * active tab, the channel changed accordingly and the respective
     * notification is activated.
     * This also manages the {@link module:notifier.Notifier~channelTitles} Map.
     *
     * @param {module:channel/core.Channel} channel - The channel to show a
     *                                                notification for.
     * @returns {undefined}
     */
    async sendNotification(channel) {
        // Mute notifications for the current tab
        const [ tab, showNotifications ] = await Promise.all([
            browser.tabs.query({
                active: true,
                currentWindow: true,
                url: channel.url
            }),
            this.showNotifications()
        ]);

        const liveInterpretation = await this._getLiveInterpretation();
        if(showNotifications && !tab.length) {
            let title = null;
            if((await and(channel.live.isLive(LiveState.TOWARD_OFFLINE), this.onlineNotifications())) && this._channelStateChanged(channel)) {
                title = _("onlineNotification", channel.toString());
            }
            else if((await and(channel.live.isLive(liveInterpretation), this.titleNotifications(), or(channel.live.state === LiveState.LIVE, this.nonliveNotifications()))) && !this._channelStateChanged(channel) && this.channelTitles.get(channel.id) != channel.title) {
                if(channel.live.state !== LiveState.REDIRECT) {
                    title = _("updateNotification", channel.toString());
                }
                else {
                    title = _("redirectUpdateNotification", channel.toString(), channel.live.alternateUsername);
                }
            }
            else if((await and(not(channel.live.isLive(liveInterpretation)), this.offlineNotifications())) && this.channelTitles.has(channel.id)) {
                title = _("offlineNotification", channel.toString());
            }
            else if(channel.live.state > LiveState.LIVE && (await this.nonliveNotifications()) && this._channelStateChanged(channel)) {
                const stateName = LiveState.REDIRECT === channel.live.state ? "Redirect" : "Rebroadcast";
                title = _("nonliveNotification", [
                    channel.toString(),
                    _("nonliveNotificationState" + stateName, channel.live.alternateUsername)
                ]);
            }

            if(title !== null) {
                const opts = {
                    type: "basic",
                    title,
                    message: channel.title,
                    iconUrl: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE)
                };

                browser.notifications.create(`cn${channel.id}`, opts);
                browser.runtime.sendMessage("@notification-sound", "new-notification");
            }
        }

        if(await channel.live.isLive(liveInterpretation)) {
            this.channelTitles.set(channel.id, channel.title);
        }
        else {
            this.channelTitles.delete(channel.id);
        }

        this._setChannelState(channel);
    }
    /**
     * Callback to call, whenever an event gets removed. This removes the
     * channel from the internal map.
     *
     * @param {number} channelId - ID of the channel that was removed.
     * @returns {undefined}
     */
    onChannelRemoved(channelId) {
        if(this.channelTitles.has(channelId)) {
            this.channelTitles.delete(channelId);
        }
        if(this.channelStates.has(channelId)) {
            this.channelStates.delete(channelId);
        }
    }

    /**
     * Notify the user, that the string has been copied to the clipboard.
     *
     * @param {string} channelName - Name of the channel that was copied.
     * @returns {undefined}
     */
    notifyCopied(channelName) {
        browser.notifications.create("copy", {
            type: "basic",
            title: _("copyNotification", channelName),
            message: "",
            iconUrl: "assets/images/icon.svg"
        });
    }
}
