/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Model for the Notifications
 */

var tabs = require('sdk/tabs');
var Notifications = require('sdk/notifications');

function Notifier() {
    
}

Notifier.prototype.sendNotification = function(channel) {
    if(!channel.compareUrl(tabs.activeTab.url)) {
        if(channel.live) {
            Notifications.notify({
                title: _("onlineNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.image[1],
                onClick: function() {
                    // open tab
                }
            });
        }
        // title change?
        else {
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