/**
 * Model for the Notifications
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module notifier
 */

const tabs = require('sdk/tabs'),
      Notifications = require('sdk/notifications'),
      { get: _ } = require('sdk/l10n'),
      { prefs } = require("sdk/simple-prefs");
const { LiveState } = require("channel/live-state");

/**
 * Size of the image shown in the notification.
 * @const {number}
 * @default 100
 */
const NOTIFICATION_ICON_SIZE = 100;

/**
 * @constructs module:notifier.Notifier
 * @argument {Object} options - Event listeners, namely onClick listener as
 *                              property of the object.
 */
function Notifier(options) {
    this.channelTitles = new Map();
    this._onClick = options.onClick;
}

/** @alias module:notifier.Notifier.prototype */
Notifier.prototype = {
    _onClick: null,
    /**
     * The last title of each channel by id the notifier last saw.
     * @type {Map.<number, string>}
     */
    channelTitles: null,
    /**
     * If online notifications should be shown.
     * @type {boolean}
     * @readonly
     */
    get onlineNotifications() {
        return prefs.onlineNotification;
    },
    /**
     * If title change notifications should be shown.
     * @type {boolean}
     * @readonly
     */
    get titleNotifications() {
        return prefs.titleChangeNotification;
    },
    /**
     * If offline notifications should be shown.
     * @type {boolean}
     * @readonly
     */
    get offlineNotifications() {
        return prefs.offlineNotification;
    },
    /**
     * If non-live types are handled like a non-binary state, they get custom
     * notifications when this is set.
     * @type {boolean}
     * @readonly
     */
    get nonliveNotifications() {
        return prefs.nonliveNotifications;
    },
    /**
     * If any notifications are to be shown
     * @type {boolean}
     * @readonly
     */
    get showNotifications() {
        return this.onlineNotifications || this.titleNotifications || this.offlineNotifications;
    },
    /**
     * Determine if the channel should be considered according to the value of
     * live property, even when its state is not disabled.
     * @argument {module:channel/core.Channel} channel - The channel to check
     * @return {boolean}
     */
    isSimple(channel) {
        return prefs.panel_nonlive === 0 || prefs.panel_nonlive == 3 || !channel.state.enabled;
    },
    /**
     * Show a notification to the user, if the channel isn't in the currently
     * active tab, the channel changed accordingly and the respective
     * notification is activated.
     * This also manages the {@link module:notifier.Notifier~channelTitles} Map.
     * @argument {module:channel/core.Channel} channel - The channel to show a
     *                                                  notification for.
     */
    sendNotification(channel) {
        //TODO don't announce state changes as title changes.
        // Mute notifications for the current tab
        if(this.showNotifications && !channel.url.some((url) => url === tabs.activeTab.url)) {
            let title = null;
            if(this.isSimple(channel) && channel.live && this.onlineNotifications && !this.channelTitles.has(channel.id)) {
                title = _("onlineNotification", channel.toString());
            }
            else if((channel.live || !channel.state.enabled) && (this.isSimple(channel) || this.nonliveNotifications) && this.titleNotifications && this.channelTitles.get(channel.id) != channel.title) {
                title = _("updateNotification", channel.toString());
            }
            else if(this.isSimple(channel) && !channel.live && this.offlineNotifications && this.channelTitles.has(channel.id)) {
                title = _("offlineNotification", channel.toString());
            }
            else if(channel.state.enabled && this.nonliveNotifications && this.channelTitles.get(channel.id) == channel.title) {
                const stateName = LiveState.REDIRECT === channel.state.state ? "redirect" : "rebroadcast";
                title = _("nonliveNotification", channel.toString(), _("nonliveNotification_state_"+stateName));
            }

            if(titleType !== null) {
                Notifications.notify({
                    title: _(titleType, channel.toString()),
                    text: channel.title,
                    iconURL: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE),
                    onClick: () => this._onClick(channel)
                });
            }
        }

        if(channel.live || channel.state.enabled)
            this.channelTitles.set(channel.id, channel.title);
        else
            this.channelTitles.delete(channel.id);
    },
    /**
     * Callback to call, whenever an event gets removed. This removes the
     * channel from the internal map.
     * @argument {number} channelId - ID of the channel that was removed.
     */
    onChannelRemoved(channelId) {
        if(this.channelTitles.has(channelId))
            this.channelTitles.delete(channelId);
    }
};

exports.Notifier = Notifier;
