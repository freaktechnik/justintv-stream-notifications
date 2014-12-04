/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Controller of the extension
 */

//TODO l10n. Everywhere.
//TODO mark channels offline on startup

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
            list.liveStatus(false, function(live) {
                view = new ListView(live, 1);
            });
            cm = new ChannelsManager(list);
        },
        onChannelupdated: function(channel) {
            notifier.sendNotification(channel);
            cm.onChannelUpdated(channel);
            //TODO ListView
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
            //TODO listview
        },
        onUseradded: function(user) {
            cm.onUserAdded(user);
        },
        onBeforechanneldeleted: function(channel) {
            list.getChannelsByType(channel.type, function(channels) {
                // the list of channels we get includes the to-be-deleted channel, which we don't want anymore.
                channels.some(function(c, i) {
                    if(c.login == channel.login) {
                        channels.splice(i, 1);
                        return true;
                    }
                    return false;
                });
                providers[channel.type].updateRequest(channels, function(chs) {
                    chs.forEach(function(chan) {
                        list.setChannel(chan);
                    });
                });
            });
        },
        onChanneldeleted: function(channelId) {
            cm.onChannelRemoved(channelId);
            notifier.onChannelRemoved(channelId);
            //TODO listview
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

// extension installation/upgrade stuff
if(self.loadReason == "install") {
    if(prefs.prefs.updateTab) // respect user's prefs that reinstall the extension
        tabs.open({url: BASE_URL + "/first-run.html"});
}
else if(self.loadReason == "upgrade") {
    if(prefs.prefs.updateTab)
        tabs.open({url: BASE_URL + "/changes-" + self.version + ".html"});

    //TODO migrate channels to channels-manager
}

