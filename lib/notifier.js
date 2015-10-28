/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Model for the Notifications
 */

const tabs = require('sdk/tabs'),
      Notifications = require('sdk/notifications'),
      { get: _ } = require('sdk/l10n'),
      { prefs } = require("sdk/simple-prefs");

var { selectOrOpenTab } = require('./channel-utils');

const NOTIFICATION_ICON_SIZE = 100;

Notifier.prototype.channelTitles = null;
Notifier.prototype.onlineNotifications = true;
Notifier.prototype.titleNotifications = true;
Notifier.prototype.offlineNotifications = false;

function Notifier() {
    this.channelTitles = new Map();
}

Notifier.prototype = {
    channelTitles: null,
    get onlineNotifications() {
        return prefs.onlineNotifications;
    },
    get titleNotifications() {
        return prefs.titleNotifications;
    },
    get offlineNotifications() {
        return prefs.offlineNotifications;
    },
    sendNotification: function(channel) {
        // Mute notifications for the current tab
        if(!channel.url.some((url) => url === tabs.activeTab.url)) {
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
                    onClick: selectOrOpenTab.bind(null, channel)
                });
            }
        }

        if(channel.live)
            this.channelTitles.set(channel.id, channel.title);
        else
            this.channelTitles.delete(channel.id);
    },
    onChannelRemoved: function(channelId) {
        if(this.channelTitles.has(channelId))
            this.channelTitles.delete(channelId);
    }
};

exports.Notifier = Notifier;
