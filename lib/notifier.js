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
     * If any notifications are to be shown
     * @type {boolean}
     * @readonly
     */
    get showNotifications() {
        return this.onlineNotifications || this.titleNotifications || this.offlineNotifications;
    },
    /**
     * Show a notification to the user, if the channel isn't in the currently
     * active tab, the channel changed accordingly and the respective
     * notification is activated.
     * This also manages the {@link module:notifier.Notifier~channelTitles} Map.
     * @argument {module:channel/core.Channel} channel - The channel to show a
     *                                                  notification for.
     */
    sendNotification: function(channel) {
        // Mute notifications for the current tab
        if(this.showNotifications && !channel.url.some((url) => url === tabs.activeTab.url)) {
            let titleType = null;
            if(channel.live && this.onlineNotifications && !this.channelTitles.has(channel.id)) {
                titleType = "onlineNotification";
            }
            else if(channel.live && this.titleNotifications && this.channelTitles.get(channel.id) != channel.title) {
                titleType = "updateNotification";
            }
            else if(!channel.live && this.offlineNotifications && this.channelTitles.has(channel.id)) {
                titleType = "offlineNotification";
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

        if(channel.live)
            this.channelTitles.set(channel.id, channel.title);
        else
            this.channelTitles.delete(channel.id);
    },
    /**
     * Callback to call, whenever an event gets removed. This removes the
     * channel from the internal map.
     * @argument {number} channelId - ID of the channel that was removed.
     */
    onChannelRemoved: function(channelId) {
        if(this.channelTitles.has(channelId))
            this.channelTitles.delete(channelId);
    }
};

exports.Notifier = Notifier;
