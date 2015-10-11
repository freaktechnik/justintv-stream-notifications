/**
 * Controller of the extension
 * @author Martin Giger
 * @license MPL-2.0
 * @module main
 */

"use strict";

var prefs = require('sdk/simple-prefs'),
    self = require('sdk/self'),
    tabs = require('sdk/tabs');

const { ListView } = require('./listview'),
      { Notifier } = require('./notifier'),
      { UpdateQueue } = require('./queue'),
      { ChannelList } = require('./channellist'),
      { ChannelsManager } = require('./channels-manager'),
      qs = require('./queueservice'),
      providers = require('./providers'),
      { EventSink } = require('./provider-events');

const BASE_URL = "http://jtvn.humanoids.be";

var currentId;
/**
 * So this is a magic function. It makes things work by being kind of a reversed
 * once. But let me explain:
 * This function will only execute the function if it is the most recently
 * registered one. This is global and not invoker bound, so if I ever
 * move this to its own module (utils?) it'd be invoker bound, but no idea how
 * at this point, plus I don't need it. The first argument has to be an unique
 * ID, which is used to check if the callback is the most recent one.
 * This is used to avoid race conditions with DB callbacks when channels are
 * deleted.
 * @argument newId - An id for this new callback
 * @argument {function} fn
 */
function invokeOnce(newId, fn) {
    currentId = newId;
    return function(...args) {
        if(currentId == newId) {
            fn(...args);
        }
    };
}

// setup objects and events
var view, cm,
    notifier = new Notifier(),
    list = new ChannelList({
        onReady: function() {
            // Setup stuff we need
            cm = new ChannelsManager(list);
            view = new ListView(false, parseInt(prefs.prefs.panel_style, 10), prefs.prefs.panel_extras, list);
            view.on("opencm", function() {
                cm.open();
            });

            list.liveStatus().then(function(status) {
                view.liveStatus = status;
            });

            // Set up the update requests.
            let queueUpdateRequests = (p) => {
                list.getChannelsByType(p).then(function(channels) {
                    if(channels.length)
                        providers[p].updateRequest(channels);
                });
                if(providers[p].supports.favorites) {
                    list.getUsersByType(p).then(function(users) {
                        if(users.length)
                            providers[p].updateFavsRequest(users);
                    });
                }
            };

            for(let p in providers) {
                queueUpdateRequests(p);
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
                if(channel.live) {
                    notifier.sendNotification(channel);
                }
            });
            list.getChannelsByType(channels[0].type).then(function(chans) {
                providers[chans[0].type].updateRequest(chans);
            });
            view.addChannels(channels);
        },
        onUseradded: function(user) {
            console.log("User added");
            cm.onUserAdded(user);
            if(providers[user.type].supports.favorites) {
                list.getUsersByType(user.type).then(function(users) {
                    providers[user.type].updateFavsRequest(users);
                });
            }
        },
        onBeforechanneldeleted: function(channel) {
            qs.pause();
        },
        onChanneldeleted: function(channel) {
            list.getChannelsByType(channel.type).then(invokeOnce(channel.id, function(channels) {
                console.log("requeueing");
                if(channels.length > 0) {
                    providers[channel.type].updateRequest(channels);
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
            if(providers[user.type].supports.favorites) {
                list.getUsersByType(user.type).then(function(users) {
                    if(users.length > 0) {
                        providers[user.type].updateFavsRequest(users);
                    }
                    else {
                        providers[user.type].removeFavsRequest();
                    }
                });
            }
        }
    }),
    eventSink = new EventSink({
        onUpdateduser: (user) => {
            list.setUser(user);
        },
        onNewchannels: (channels) => {
            list.addChannels(channels);
        },
        onUpdatedchannels: (channels) => {
            if(Array.isArray(channels)) {
                channels.forEach(function(channel) {
                    list.setChannel(channel);
                });
            }
            else {
                list.setChannel(channels);
            }
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

prefs.on("updateInterval", function() {
    qs.updateQueueOptions(1000*prefs.prefs.updateInterval);
});

prefs.on("panel_style", function() {
    view.setStyle(parseInt(prefs.prefs.panel_style, 10));
});

prefs.on("panel_extras", function() {
    view.setExtrasVisibility(prefs.prefs.panel_extras);
});

// extension installation/upgrade stuff
if(self.loadReason == "install") {
    if(prefs.prefs.updateTab) // respect user's prefs that reinstall the extension
        tabs.open({url: BASE_URL + "/firstrun/"});
}
else if(self.loadReason == "upgrade") {
    if(prefs.prefs.updateTab)
        tabs.open({
            url: BASE_URL + "/changes/" + self.version + "/",
            inBackground: true
        });
}

