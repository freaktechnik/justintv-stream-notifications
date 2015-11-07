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

let { get: _ } = require("sdk/l10n");
const { NotificationBox: showNotificationBox } = require("notification-box/lib/notification-box");

const { ListView } = require('./listview'),
      { Notifier } = require('./notifier'),
      { UpdateQueue } = require('./queue'),
      { ChannelList } = require('./channel/list'),
      { ChannelsManager } = require('./channel/manager'),
      qs = require('./queueservice'),
      providers = require('./providers'),
      { EventSink } = require('./providers/events');
const { Task: { async } } = require("resource://gre/modules/Task.jsm");
const { when } = require("sdk/event/utils");
const { selectOrOpenTab } = require('./channel/utils');

const BASE_URL = "http://jtvn.humanoids.be";
const S_TO_MS_FACTOR = 1000;

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
 * @argument {*} newId - An id for this new callback
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

// Set up the update requests.
let queueUpdateRequests = (p, list) => {
    list.getChannelsByType(p).then((channels) => {
        if(channels.length)
            providers[p].updateRequest(channels);
    });
    if(providers[p].supports.favorites) {
        list.getUsersByType(p).then((users) => {
            if(users.length)
                providers[p].updateFavsRequest(users);
        });
    }
};

let updateChannels = async(function*(p, chlist) {
    let channels = yield chlist.getChannelsByType(p);
    if(channels.length) {
        let chans = yield providers[p].updateChannels(channels);
        if(Array.isArray(chans)) {
            chans.forEach(function(channel) {
                chlist.setChannel(channel);
            });
        }
        else {
            chlist.setChannel(chans);
        }
    }
});

// setup objects and events
var cm = new ChannelsManager(),
    view = new ListView(false, parseInt(prefs.prefs.panel_style, 10), prefs.prefs.panel_extras, {
        onOpencm: () => cm.open(),
        onAddchannel: (type, login) => cm.addChannel(login, type)
    }),
    notifier = new Notifier(),
    list = new ChannelList({
        onReady: function() {
            // Setup stuff we need
            if(!view.ready) {
                Promise.all([
                    when(view, "ready"),
                    list.getChannelsByType(null)
                ]).then(([v, channels]) => view.addChannels(channels));
            }
            else {
                list.getChannelsByType(null)
                    .then((channels) => view.addChannels(channels));
            }

            cm.on("addchannel", (channel) => list.addChannel(channel));
            cm.on("removechannel", (channelId) => list.removeChannel(channelId));
            cm.on("removeuser", async(function*(userId, removeFollows) {
                if(removeFollows) {
                    yield list.removeChannelsByUserFavorites(userId);
                }
                return list.removeUser(userId);
            }));
            cm.on("adduser", (user) => list.addUser(user));
            cm.on("addchannels", (channels) => list.addChannels(channels));
            cm.on("updatechannel", (channelId) => {
                list.getChannel(channelId)
                    .then((channel) => providers[channel.type].updateChannel(channel.login))
                    .then((channel) => list.setChannel(channel));
            });
            cm.on("updatefavorites", async(function*(userId) {
                let users = [];
                if(userId) {
                    let user = yield list.getUser(userId);
                    users.push(user);
                }
                else {
                    users = yield list.getUsersByType();
                }

                let updatedUser, channels;
                for(let user of users) {
                    if(providers[user.type].supports.favorites) {
                        [ updatedUser, channels ] = yield providers[user.type].getUserFavorites(user.login);
                        list.setUser(updatedUser);
                        // Can't just call cm.addUserFavorites(user.login, user.type) because of this.
                        list.addChannels(channels.filter((ch) => user.favorites.every((fav) => fav !== ch.login)));
                    }
                }
            }));
            cm.on("getdata", () => {
                Promise.all([
                    list.getChannelsByType()
                    .then((channels) => channels.forEach((ch) => cm.onChannelAdded(ch))),
                    list.getUsersByType()
                    .then((users) => users.forEach((usr) => cm.onUserAdded(usr)))
                ]).then(() => cm.loading = false);
            });

            view.on("refresh", (channelId) => {
                if(channelId) {
                    cm.refreshChannel(channelId);
                }
                else {
                    Object.keys(providers).forEach((type) => updateChannels(type, list));
                }
            });

            view.on("open", async(function*(channelId, what) {
                let channel;
                if(typeof channelId === "string") {
                    channel = {
                        url: [channelId],
                        live: true
                    };
                }
                else {
                    channel = yield list.getChannel(channelId);
                }

                selectOrOpenTab(channel, what);
           }));

            for(let p in providers) {
                queueUpdateRequests(p, list);
            }
        },
        onClear: (hard) => {
            if(hard) {
                showNotificationBox({
                    value: "jtvn-dberased",
                    label: _("lost_channels"),
                    priority: "WARNING_HIGH",
                    persistence: 10,
                    image: self.data.url("./icon18.png"),
                    buttons: [
                        {
                            label: _("manageChannels_label"),
                            onClick: () => cm.open()
                        }
                    ]
                });
            }
        },
        onUnfixableerror: () => {
            showNotificationBox({
                value: "jtvn-restorefailed",
                label: _("restore_failed"),
                priority: "CRITICAL_LOW",
                persistence: 10,
                image: self.data.url("./offline18.png"),
                buttons: [
                    {
                        label: _("restore_action"),
                        onClick: () => tabs.open({url: "https://support.mozilla.org/kb/refresh-firefox-reset-add-ons-and-settings"})
                    }
                ]
            });
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
        onBeforechanneldeleted: function(channelId) {
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
    interval: S_TO_MS_FACTOR * prefs.prefs.updateInterval,
    amount:   1 / prefs.prefs.queue_ratio,
    maxSize:  prefs.prefs.queue_maxRequestBatchSize
});

// Preference change listeners
prefs.on("manageChannels", () => cm.open());

prefs.on("updateInterval", () => {
    qs.updateQueueOptions(S_TO_MS_FACTOR * prefs.prefs.updateInterval);
});

prefs.on("panel_style", () => {
    view.setStyle(parseInt(prefs.prefs.panel_style, 10));
});

prefs.on("panel_extras", () => {
    view.setExtrasVisibility(prefs.prefs.panel_extras);
});

// extension installation/upgrade stuff
if(self.loadReason == "install" && prefs.prefs.updateTab) {
    tabs.open({url: BASE_URL + "/firstrun/"});
}
else if(self.loadReason == "upgrade" && prefs.prefs.updateTab) {
    tabs.open({
        url: BASE_URL + "/changes/" + self.version + "/",
        inBackground: true
    });
}

