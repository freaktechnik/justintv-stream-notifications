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

const setChannels = function(channels) {
    channels.forEach(function(channel) {
        list.setChannel(channel);
    });
};

// setup objects and events
var view, cm,
    notifier = new Notifier({
        onlineNotifications : prefs.prefs.onlineNotification,
        titleNotifications  : prefs.prefs.titleChangeNotification,
        offlineNotifications: prefs.prefs.offlineNotification
    }),
    list     = new ChannelList({
        onReady: function() {
            list.liveStatus(null, function(status) {
                view = new ListView(status, parseInt(prefs.prefs.panel_style, 10), list);
                view.on("opencm", function() {
                    cm.open();
                });
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
                providers[chans[0].type].updateRequest(chans, setChannels);
            });
            view.addChannels(channels);
        },
        onUseradded: function(user) {
            console.log("User added");
            cm.onUserAdded(user);
            list.getUsersByType(user.type, function(users) {
                providers[user.type].updateFavsRequest(users, setChannels);
            });
        },
        onBeforechanneldeleted: function(channel) {
            qs.pause();
        },
        onChanneldeleted: function(channel) {
            list.getChannelsByType(channel.type, invokeOnce(channel.id, function(channels) {
                console.log("requeueing");
                if(channels.length > 0) {
                    providers[channel.type].updateRequest(channels, setChannels);
                }
                else {
                    providers[channel.type].removeRequest();
                }
                qs.resume();
            }));
            cm.onChannelRemoved(channel.id);
            notifier.onChannelRemoved(channel.id);
            view.removeChannel(channel.id);
        },
        onUserdeleted: function(user) {
            cm.onUserRemoved(user.id);
            /* not doing the same mass deletion stuff as for channels, as I
               assume there are less users and it'd mess up the queue's pausing,
               if a user is removed because a channel was deleted.
             */
            list.getUsersByType(user.type, function(users) {
                if(users.length > 0) {
                    providers[user.type].updateFavsRequest(users, setChannels);
                }
                else {
                    providers[user.type].removeFavsRequest();
                }
            });
        }
    });

/**
 * So this is a magic function. It makes things work. But let me explain:
 * This function will only execute the function if it is the most recently
 * registered one. This is global and not invoker bound, so if I ever
 * move this to its own module (utils?) it'd be invoker bound, but no idea how
 * at this point, plus I don't need it. IT also only supports one argument for
 * the callback at the moment, which should be changed if it is generalized.
 * The first argument has to be an unique ID, which is used to check if the
 * function is the most recent one.
 * This is used to avoid race conditions with DB callbacks when channels are
 * deleted.
 */
var currentId;
function invokeOnce(newId, fn) {
    currentId = newId;
    return function(arg) {
        if(currentId == newId) {
            fn(arg);
        }
    };
}

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
