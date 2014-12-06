/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Model for the Panel
 */
 
// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

const { Panel }        = require('sdk/panel');
const { ToggleButton } = require('sdk/ui');
var   { prefs }        = require('sdk/simple-prefs'),
      _                = require('sdk/l10n').get;

var { selectOrOpenTab } = require('./channel-utils'),
    providers           = require('./providers');

const liveIcons = {
    "18": "./icon18.png",
    "32": "./icon32.png",
    "36": "./icon36.png", //hidpi
    "48": "./icon.png",
    "64": "./icon64.png" // hidpi
},
offlineIcons = {
    "18": "./offline18.png",
    "32": "./offline32.png",
    "36": "./offline36.png", //hidpi
    "64": "./offline64.png" // hidpi
};

ListView.STYLE_COMPACT   = 0;
ListView.STYLE_NORMAL    = 1;
ListView.STYLE_THUMBNAIL = 2;

ListView.prototype.button = null;
ListView.prototype.panel = null;
ListView.prototype.style = 1;
function ListView(live, style, chlist) {
    this.initialize({});
    this.style    = style;
    var liveState = live,
        that      = this;

    Object.defineProperties(this, {
        "liveState": {
            get: function() {
                return liveState;
            },
            set: function(val) {
                liveState = val;
                if(val) {
                    this.button.icon = liveIcons;
                    this.button.label = _("live_widget_label");
                }
                else {
                    this.button.icon = offlineIcons;
                    this.button.label = _("live_panel_label_offline");
                }
            }
        },
        "panelWidth": {
            get: function() {
                return prefs.panel_minWidth;
            }
        },
        "panelHeight": {
            get: function() {
                return prefs.panel_maxHeight;
            }
        }
    });

    // Construct Buttons
    this.button = ToggleButton({
        id: "live-channels-button",
        label: this.liveState?_("live_widget_label"):_("live_panel_label_offline"),
        icon: this.liveState?liveIcons:offlineIcons,
        onClick: (function(state) {
            if(!state.checked)
                this.panel.hide();
            else
                this.panel.show({position: this.button});
        }).bind(that)
    });
    this.panel = Panel({
        width: that.panelWidth,
        position: that.button,
        contextMenu: true,
        contentURL: "./list.html",
        contentScriptOptions: {
            "maxHeight": that.panelHeight,
            "panelWidth": that.panelWidth,
            "style": that.style
        },
        onHide: (function() {
            if(this.button.state("window").checked)
                this.button.state("window", {"checked": false});
        }).bind(that)
    });

    this.panel.port.on("resizePanel", (function(dimensions) {
        this.panel.resize(dimensions[0], dimensions[1]);
    }).bind(this));

    this.panel.port.on("offline", function() {
        this.liveState = false;
    });

    this.panel.port.on("open", function(channelId) {
        chlist.getChannel(function(channel) {
            selectOrOpenTab(channel);
        }, channelId);
    });
    
    this.panel.port.on("openArchive", function(channelId) {
        chlist.getChannel(function(channel) {
            selectOrOpenTab(channel, true);
        }, channelId);
    });
    
    this.panel.port.on("refresh", function(channelId) {
        //TODO Potentially outsource this
        if(channelId) {
            //TODO something's wrong here.
            chlist.getChannel(function(channel) {
                providers[channel.type].updateChannel(channel.login, chlist.setChannel.bind(chlist));
            }, channelId);
        }
        else {
            for(var p in providers) {
                chlist.getChannelsByType(p, function(channels) {
                    providers[p].updateChannels(channels, function(channels) {
                        channels.forEach(function(channel) {
                            chlist.setChannel(channel);
                        });
                    });
                });
            }
        }
    });
    
    this.panel.port.on("configure", (function() {
        this.panel.hide();
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
    this.panel.port.emit("setStyle", style);
};

ListView.prototype.addChannels = function(channels) {
    this.panel.port.emit("addChannels", channels);
};
ListView.prototype.removeChannel = function(channelId) {
    this.panel.port.emit("removeChannel", channelId);
};
ListView.prototype.setChannelLive = function(channel) {
    this.panel.port.emit("setOnline", channel);
    this.liveState = true;
};
ListView.prototype.setChannelOffline = function(channel) {
    this.panel.port.emit("setOffline", channel);
};

ListView.prototype.onChannelChanged = function(channel) {
    console.log("updating state for "+channel.login);
    if(channel.live)
        this.setChannelLive(channel);
    else
        this.setChannelOffline(channel);
};

exports.ListView = ListView;
