/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Controller of the extension
 */

"use strict";

var prefs = require('sdk/simple-prefs'),
    self  = require('sdk/self'),
    tabs  = require('sdk/tabs');

var { ListView }        = require('./listview'),
    { Notifier }        = require('./notifier'),
    { UpdateQueue }     = require('./queue'),
    { ChannelList }     = require('./channellist'),
    { ChannelsManager } = require('./channels-manager'),
    qs                  = require('./queueservice'),
    providers           = require('./providers');

const BASE_URL = "http://jtvn.humanoids.be";

// setup objects and events
var view, cm,
    notifier = new Notifier({
        onlineNotifications : prefs.prefs.onlineNotification,
        titleNotifications  : prefs.prefs.titleChangeNotification,
        offlineNotifications: prefs.prefs.offlineNotification
    }),
    list     = new ChannelList({
        onReady: function() {
            view = new ListView(false, parseInt(prefs.prefs.panel_style, 10), list);
            view.on("opencm", function() {
                cm.open();
            });
            cm = new ChannelsManager(list);
            
            //upgrade code
            if(self.loadReason == "upgrade") {
                if(prefs.prefs.autoUsername)
                    cm.getLoginName("twitch");

                prefs.prefs.twitchchannelList.replace(" ","").split(",").forEach(function(channel) {
                    cm.addChannel(channel, "twitch");
                });

                prefs.prefs.twitchusernameList.replace(" ","").split(",").forEach(function(user) {
                    cm.addUserFavorites(user);
                });
            }
        },
        onChannelupdated: function(channel) {
            notifier.sendNotification(channel);
            cm.onChannelUpdated(channel);
            view.onChannelChanged(channel);
        },
        onUserupdated: function(user) {
            cm.onUserUpdated(user);
        },
        onChannelsadded: function(channels) {
            channels.forEach(function(channel) {
                cm.onChannelAdded(channel);
            });
            list.getChannelsByType(channels[0].type, function(chans) {
                providers[chans[0].type].updateRequest(chans, function(chs) {
                    chs.forEach(function(channel) {
                        list.setChannel(channel);
                    });
                });
            });
            view.addChannels(channels);
        },
        onUseradded: function(user) {
            cm.onUserAdded(user);
        },
        onBeforechanneldeleted: function(channel) {
            //pause queue or something to avoid race conditions?
        },
        onChanneldeleted: function(channel) {
            list.getChannelsByType(channel.type, function(channels) {
                console.log("requeueing");
                if(channels.length > 0) {
                    providers[channel.type].updateRequest(channels, function(chs) {
                        chs.forEach(function(chan) {
                            list.setChannel(chan);
                        });
                    });
                }
                else {
                    providers[channel.type].removeRequest();
                }
            });
            cm.onChannelRemoved(channel.id);
            notifier.onChannelRemoved(channel.id);
            view.removeChannel(channel.id);
        },
        onUserdeleted: function(userId) {
            cm.onUserRemoved(userId);
        }
    });

qs.setQueueOptions({
    interval: 1000*prefs.prefs.updateInterval,
    amount:   1/prefs.prefs.queue_ratio,
    maxSize:  prefs.prefs.queue_maxRequestBatchSize
});

// Preference change listeners
prefs.on("manageChannels", function() {
    cm.open();
});

prefs.on("onlineNotification", function() {
    notifier.onlineNotifications = prefs.prefs.onlineNotification;
});

prefs.on("titleChangeNotification", function() {
    notifier.titleNotifications = prefs.prefs.titleChangeNotification;
});

prefs.on("offlineNotification", function() {
    notifier.offlineNotifications = prefs.prefs.offlineNotification;
});

prefs.on("updateInterval", function() {
    qs.updateQueueOptions(1000*prefs.prefs.updateInterval);
});

prefs.on("panel_style", function() {
    view.setStyle(parseInt(prefs.prefs.panel_style, 10));
});

// extension installation/upgrade stuff
if(self.loadReason == "install") {
    if(prefs.prefs.updateTab) // respect user's prefs that reinstall the extension
        tabs.open({url: BASE_URL + "/firstrun/"});
}
else if(self.loadReason == "upgrade") {
    if(prefs.prefs.updateTab)
        tabs.open({url: BASE_URL + "/changes/" + self.version + "/"});
}
