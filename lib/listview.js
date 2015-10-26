/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Model for the Panel
 */

"use strict";

// setup event handling
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const tabs             = require("sdk/tabs");
var   _                = require('sdk/l10n').get;

const { prefs } = require("sdk/simple-prefs");

var { selectOrOpenTab } = require('./channel-utils'),
    providers           = require('./providers');
const livestreamer = require("./livestreamer");

ListView.STYLE_COMPACT   = 0;
ListView.STYLE_NORMAL    = 1;
ListView.STYLE_THUMBNAIL = 2;

ListView.prototype.style = 1;
ListView.prototype.list  = null;
function ListView(live, style, extras, chlist) {
    var liveState = live;

    if(require("sdk/system/xul-app").is("Fennec"))
        this.list = require("./list/fennec").ListView(live, style);
    else
        this.list = require("./list/firefox").ListView(live, style, extras);

    Object.defineProperties(this, {
        "liveState": {
            get: function() {
                return liveState;
            },
            set: (val) => {
                liveState = val;
                this.list.setLiveState(val);
            }
        }
    });

    this.list.on("offline", () => {
        this.liveState = false;
    });

    this.list.on("open", (channelId, what) => {
        if(typeof channelId === "string") {
            if(prefs.livestreamer_enabled || what == "livestreamer")
                livestreamer.launch(channelId);
            else
                tabs.open(channelId);
        }
        else {
            chlist.getChannel(channelId).then((channel) => {
                if(what === "chat")
                    tabs.open(channel.chatUrl);
                else if((prefs.livestreamer_enabled && what !== "archive") || what == "livestreamer")
                    livestreamer.launch(channel.url[0]);
                else
                    selectOrOpenTab(channel, what == "archive");
            });
        }
    });

    let updateChannels = async(function*(p) {
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

    this.list.on("refresh", function(channelId) {
        if(channelId) {
            chlist.getChannel(channelId).then((channel) => {
                providers[channel.type].updateChannel(channel.login).then(chlist.setChannel.bind(chlist));
            });
        }
        else {
            Object.keys(providers).forEach((type) => updateChannels(type));
        }
    });

    this.list.on("configure", () => emit(this, "opencm"));

    this.list.on("explore", (type) => {
        providers[type].getFeaturedChannels()
            .then((channels) => this.list.setFeatured(channels, type),
                  () => this.list.setFeatured([], type));
    });

    this.list.on("search", (type, q) => {
        providers[type].search(q)
            .then((channels) => this.list.setFeatured(channels, type, q),
                  () => this.list.setFeatured([], type, q));
    });

    this.list.on("add", (type, login) => emit(this, "addchannel", type, login));

    this.list.on("ready", () => {
        // add existing channels
        chlist.getChannelsByType(null).then((channels) => {
            if(channels.length > 0)
                this.addChannels(channels);
        });

        var exploreProviders = [];
        for(let p in providers) {
            if(providers[p].supports.featured)
                exploreProviders.push({
                    type: p,
                    name: providers[p].name
                });
        }
        this.list.addExploreProviders(exploreProviders);
    });
}
ListView.prototype = Object.create(EventTarget.prototype);
ListView.prototype.constructor = ListView;

ListView.prototype.setStyle = function(style) {
    this.list.setStyle(style);
};

ListView.prototype.setExtrasVisibility = function(visible) {
    this.list.setExtras(visible);
};

ListView.prototype.addChannels = function(channels) {
    if(channels.some((channel) => channel.live))
        this.liveState = true;
    this.list.addChannels(channels);
};
ListView.prototype.removeChannel = function(channelId) {
    this.list.removeChannel(channelId);
};
ListView.prototype.setChannelLive = function(channel) {
    this.list.setOnline(channel);
    this.liveState = true;
};
ListView.prototype.setChannelOffline = function(channel) {
    this.list.setOffline(channel);
};

ListView.prototype.onChannelChanged = function(channel) {
    console.log("updating state for", channel.login);
    if(channel.live)
        this.setChannelLive(channel);
    else
        this.setChannelOffline(channel);
};

exports.ListView = ListView;
