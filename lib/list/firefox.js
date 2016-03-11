/**
 * Desktop Listview adapter
 * @author Martin Giger
 * @license MPL-2.0
 * @module list/firefox
 */

"use strict";

const { Panel } = require('sdk/panel'),
      { ToggleButton } = require('sdk/ui'),
      sp = require('sdk/simple-prefs'),
      { get: _ } = require('sdk/l10n'),
      { prefs } = sp,
      livestreamer = require("../livestreamer");

// setup event handling
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");


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

PanelList.prototype.button = null;
PanelList.prototype.panel = null;
PanelList.prototype.live = null;

const forwardEvent = function(event, close, ...args) {
    if(close)
        this.panel.hide();
    emit(this, event, ...args);
};

const EVENTS = [
    {
        name: "configure",
        close: true
    },
    {
        name: "refresh",
        close: false
    },
    {
        name: "open",
        close: true
    },
    {
        name: "add",
        close: false
    },
    {
        name: "explore",
        close: false
    },
    {
        name: "search",
        close: false
    },
    {
        name: "ready",
        close: false
    },
    {
        name: "pause",
        close: false
    },
    {
        name: "resume",
        close: false
    }
];

function PanelList(live, style, extras, nonLiveDisplay) {
    this.live = new Set();

    // Construct Buttons
    this.button = new ToggleButton({
        id: "live-channels-button",
        label: live ? _("live_widget_label") : _("live_widget_label_offline"),
        icon: live ? liveIcons : offlineIcons,
        onClick: (state) => {
            if(!state.checked)
                this.panel.hide();
            else
                this.panel.show();
        }
    });
    this.panel = new Panel({
        width: this.panelWidth,
        position: this.button,
        contextMenu: true,
        contentURL: "./list.html",
        contentScriptOptions: {
            "maxHeight": prefs.panel_maxHeight,
            "panelWidth": prefs.panel_minWidth,
            style,
            extras,
            "livestreamer": livestreamer.show,
            nonLiveDisplay
        },
        onHide: () => {
            if(this.button.state("window").checked)
                this.button.state("window", {"checked": false});
        },
        onShow: () => this.panel.port.emit("resize")
    });

    this.panel.port.on("resize", (dimensions) => {
        this.panel.resize(dimensions[0], dimensions[1]);
    });

    EVENTS.forEach((e) => this._registerEvent(e.name, e.close));

    this.panel.port.on("openChat", (channelId) => {
        this.panel.hide();
        emit(this, "open", channelId, "chat");
    });

    this.panel.port.on("openArchive", (channelId) => {
        this.panel.hide();
        emit(this, "open", channelId, "archive");
    });

    this.panel.port.on("openLivestreamer", (channelId) => {
        this.panel.hide();
        emit(this, "open", channelId, "livestreamer");
    });

    this.panel.port.on("openUrl", (url, livestreamer) => {
        this.panel.hide();
        emit(this, "open", url, livestreamer ? "livestreamer" : undefined);
    });

    this.panel.port.on("removedLive", (id) => {
        this.live.delete(id);
        this.updateBadge();

        if(this.live.size === 0) {
            emit(this, "offline");
        }
    });

    sp.on("panel_badge", () => {
        this.updateBadge();
    });

    livestreamer.events.on("existance", (show) => {
        this.panel.port.emit("livestreamerExists", show);
    });
}
PanelList.prototype = Object.create(EventTarget.prototype);
PanelList.prototype.constructor = PanelList;

PanelList.prototype._registerEvent = function(event, close) {
    this.panel.port.on(event, forwardEvent.bind(this, event, close));
};

PanelList.prototype.updateBadge = function() {
    if(prefs.panel_badge && this.live.size > 0) {
        this.button.badge = this.live.size;
    }
    else {
        this.button.badge = null;
    }
};

PanelList.prototype.setLiveState = function(state) {
    if(state) {
        this.button.icon = liveIcons;
        this.button.label = _("live_widget_label");
    }
    else {
        this.button.icon = offlineIcons;
        this.button.label = _("live_widget_label_offline");
        this.live.clear();
        this.updateBadge();
    }
};

PanelList.prototype.setStyle = function(style) {
    this.panel.port.emit("setStyle", style);
};

PanelList.prototype.setExtras = function(extras) {
    this.panel.port.emit("setExtras", extras);
};

PanelList.prototype.setNonLiveDisplay = function(style) {
    this.panel.port.emit("setNonLiveDisplay", style);
};

PanelList.prototype.addChannels = function(channels) {
    channels.forEach(function(chan) {
        if(chan.live) {
            this.live.add(chan.id);
        }
    }, this);
    this.updateBadge();
    this.panel.port.emit("addChannels", channels);
};

PanelList.prototype.removeChannel = function(channelId) {
    this.panel.port.emit("removeChannel", channelId);
};

PanelList.prototype.setOnline = function(channel) {
    if(!this.live.has(channel.id)) {
        this.live.add(channel.id);
        this.updateBadge();
    }
    this.panel.port.emit("setOnline", channel);
};

PanelList.prototype.internalSetOffline = function(channelId) {
    if(this.live.has(channelId)) {
        this.live.delete(channelId);
        this.updateBadge();

        if(this.live.size === 0) {
            emit(this, "offline");
        }
    }
};

PanelList.prototype.setOffline = function(channel) {
    this.internalSetOffline(channel.id);
    this.panel.port.emit("setOffline", channel);
};

PanelList.prototype.setDistinct = function(channel) {
    this.internalSetOffline(channel.id);
    this.panel.port.emit("setDistinct", channel);
};

PanelList.prototype.setProviders = function(providers) {
    this.panel.port.emit("setProviders", providers);
};

PanelList.prototype.setFeatured = function(channels, type, q) {
    this.panel.port.emit("setFeatured", channels, type, q);
};

PanelList.prototype.setQueueStatus = function(enabled) {
    this.panel.port.emit("queueStatus", enabled);
};

PanelList.prototype.setQueuePaused = function(paused) {
    this.panel.port.emit("queuePaused", paused);
};

exports.ListView = function(live, style, extras, nonLiveDisplay) {
    return new PanelList(live, style, extras, nonLiveDisplay);
};

