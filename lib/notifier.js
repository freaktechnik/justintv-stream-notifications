/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Model for the Notifications
 */

var tabs = require('sdk/tabs'),
    Notifications = require('sdk/notifications');

Notifier.prototype.onlineNotifications = true;
Notifier.prototype.titleNotifications = true;
Notifier.prototype.offlineNotifications = false;

function Notifier(prefs) {
    this.onlineNotifications = prefs.onlineNotifications;
    this.titleNotifications = prefs.titleNotifications;
    this.offlineNotifications = prefs.offlineNotifications;
}

Notifier.prototype.sendNotification = function(channel) {
    if(!channel.compareUrl(tabs.activeTab.url)) {
        if(channel.live && this.onlineNotifications) {
            Notifications.notify({
                title: _("onlineNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.image[1],
                onClick: function() {
                    // open tab
                }
            });
        }
        //TODO title change?
        else if(this.offlineNotifications) {
            Notifications.notify({
                title: _("offlineNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.image[1],
                onClick: function() {
                    // open tab
                }
            });
        }
    }
};

exports.Notifier = Notifier;

