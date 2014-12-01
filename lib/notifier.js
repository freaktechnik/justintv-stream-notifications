/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Model for the Notifications
 */

var tabs = require('sdk/tabs'),
    Notifications = require('sdk/notifications');

const NOTIFICATION_ICON_SIZE = 200;

Notifier.prototype.channelTitles;
Notifier.prototype.onlineNotifications = true;
Notifier.prototype.titleNotifications = true;
Notifier.prototype.offlineNotifications = false;

function Notifier(prefs) {
    this.channelTitles = new Map();
    this.onlineNotifications = prefs.onlineNotifications;
    this.titleNotifications = prefs.titleNotifications;
    this.offlineNotifications = prefs.offlineNotifications;
}

Notifier.prototype.sendNotification = function(channel) {
    if(!channel.compareUrl(tabs.activeTab.url)) {
        if(channel.live && this.onlineNotifications && !this.channelTitles.has(channel.id)) {
            this.channelTitles.set(channel.id, channel.title);
            Notifications.notify({
                title: _("onlineNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE),
                onClick: function() {
                    let hasTab = false;
                    for(let ti in tabs) {
                        if(channel.compareUrl(tabs[ti].url)) {
                            tabs[ti].activate();
                            hasTab = true;
                            break;
                        }
                    }
                    if(!hasTab)
                        tabs.open({url: channel.url[0]});
                }
            });
        }
        else if(channel.live && this.titleNotifications && this.channelTitles.get(channel.id) != channel.title) {
            this.channelTitles.set(channel.id, channel.title);
            Notifications.notify({
                title: _("updateNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE),
                onClick: function() {
                    let hasTab = false;
                    for(let ti in tabs) {
                        if(channel.compareUrl(tabs[ti].url)) {
                            tabs[ti].activate();
                            hasTab = true;
                            break;
                        }
                    }
                    if(!hasTab)
                        tabs.open({url: channel.url[0]});
                }
            });
        }
        else if(!channel.live && this.offlineNotifications && this.channelTitles.has(channel.id)) {
            this.channelTitles.delete(channel.id);
            Notifications.notify({
                title: _("offlineNotification", channel.toString()),
                text: channel.title,
                iconURL: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE),
                onClick: function() {
                    let hasTab = false;
                    for(let ti in tabs) {
                        //TODO make this compare to the archive URL
                        if(channel.compareUrl(tabs[ti].url)) {
                            tabs[ti].activate();
                            hasTab = true;
                            break;
                        }
                    }
                    if(!hasTab)
                        tabs.open({url: channel.archiveUrl});
                }
            });
        }
    }
};

exports.Notifier = Notifier;

