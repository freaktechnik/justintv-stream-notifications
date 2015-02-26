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

const tabs             = require("sdk/tabs");
var   _                = require('sdk/l10n').get;

var { selectOrOpenTab } = require('./channel-utils'),
    providers           = require('./providers');

ListView.STYLE_COMPACT   = 0;
ListView.STYLE_NORMAL    = 1;
ListView.STYLE_THUMBNAIL = 2;

ListView.prototype.style = 1;
ListView.prototype.list  = null;
function ListView(live, style, extras, chlist) {
    var liveState = live,
        that      = this;

    if(require("sdk/system/xul-app").is("Fennec"))
        this.list = require("./list/fennec").ListView(live, style);
    else
        this.list = require("./list/firefox").ListView(live, style, extras);

    Object.defineProperties(this, {
        "liveState": {
            get: function() {
                return liveState;
            },
            set: function(val) {
                liveState = val;
                that.list.setLiveState(val);
            }
        }
    });

    this.list.on("offline", (function() {
        this.liveState = false;
    }).bind(this));

    this.list.on("open", (function(channelId, what) {
        chlist.getChannel((function(channel) {
            if(what == "chat")
                tabs.open(channel.chatUrl);
            else
                selectOrOpenTab(channel, what == "archive");
        }).bind(this), channelId);
    }).bind(this));
    
    function updateChannels(p) {
        chlist.getChannelsByType(p, function(channels) {
            if(channels.length) {
                providers[p].updateChannels(channels, function(chans) {
                    if(Array.isArray(chans)) {
                        chans.forEach(function(channel) {
                            chlist.setChannel(channel);
                        });
                    }
                    else {
                        chlist.setChannel(chans);
                    }
                });
            }
        });
    }

    this.list.on("refresh", function(channelId) {
        if(channelId) {
            chlist.getChannel(function(channel) {
                providers[channel.type].updateChannel(channel.login, chlist.setChannel.bind(chlist));
            }, channelId);
        }
        else {
            for(var p in providers) {
                updateChannels(p);
            }
        }
    });
    
    this.list.on("configure", (function() {
        emit(this, "opencm");
    }).bind(this));
    
    // add existing channels
    chlist.getChannelsByType(null, (function(channels) {
        if(channels.length > 0)
            this.addChannels(channels);
    }).bind(this));
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
    console.log("updating state for "+channel.login);
    if(channel.live)
        this.setChannelLive(channel);
    else
        this.setChannelOffline(channel);
};

exports.ListView = ListView;
