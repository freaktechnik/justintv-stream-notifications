/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Desktop Listview adapter
 */

"use strict";

const { Panel } = require('sdk/panel'),
      { ToggleButton } = require('sdk/ui'),
      sp = require('sdk/simple-prefs'),
      { get: _ } = require('sdk/l10n'),
      { prefs } = sp;

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

function PanelList(live, style, extras) {
    this.live = [];

    let that = this;

    // Construct Buttons
    this.button = new ToggleButton({
        id: "live-channels-button",
        label: live?_("live_widget_label"):_("live_widget_label_offline"),
        icon: live?liveIcons:offlineIcons,
        onClick: (function(state) {
            if(!state.checked)
                this.panel.hide();
            else
                this.panel.show();
        }).bind(that)
    });
    this.panel = new Panel({
        width: that.panelWidth,
        position: that.button,
        contextMenu: true,
        contentURL: "./list.html",
        contentScriptOptions: {
            "maxHeight": prefs.panel_maxHeight,
            "panelWidth": prefs.panel_minWidth,
            "style": style,
            "extras": extras
        },
        onHide: (function() {
            if(this.button.state("window").checked)
                this.button.state("window", {"checked": false});
        }).bind(that),
        onShow: (function() {
            this.panel.port.emit("resize");
        }).bind(that)
    });

    this.panel.port.on("resize", (function(dimensions) {
        this.panel.resize(dimensions[0], dimensions[1]);
    }).bind(this));

    this.panel.port.on("configure", function() {
        that.panel.hide();
        emit(that, "configure");
    });

    this.panel.port.on("refresh", function(channelId) {
        emit(that, "refresh", channelId);
    });

    this.panel.port.on("openChat", function(channelId) {
        that.panel.hide();
        emit(that, "open", channelId, "chat");
    });

    this.panel.port.on("openArchive", function(channelId) {
        that.panel.hide();
        emit(that, "open", channelId, "archive");
    });

    this.panel.port.on("open", function(channelId) {
        that.panel.hide();
        emit(that, "open", channelId);
    });

    this.panel.port.on("removedLive", function(id) {
        that.live.splice(that.live.indexOf(id), 1);
        that.updateBadge();

        if(that.live.length === 0) {
            emit("offline", that);
        }
    });

    sp.on("panel_badge", function() {
        that.updateBadge();
    });
}
PanelList.prototype = Object.create(EventTarget.prototype);
PanelList.prototype.constructor = PanelList;

PanelList.prototype.updateBadge = function() {
    if(prefs.panel_badge && this.live.length > 0) {
        this.button.badge = this.live.length;
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
        this.live.length = 0;
        this.updateBadge();
    }
};

PanelList.prototype.setStyle = function(style) {
    this.panel.port.emit("setStyle", style);
};

PanelList.prototype.setExtras = function(extras) {
    this.panel.port.emit("setExtras", extras);
};

PanelList.prototype.addChannels = function(channels) {
    channels.forEach(function(chan) {
        if(chan.live) {
            this.live.push(chan.id);
        }
    }, this);
    this.updateBadge();
    this.panel.port.emit("addChannels", channels);
};

PanelList.prototype.removeChannel = function(channelId) {
    this.panel.port.emit("removeChannel", channelId);
};

PanelList.prototype.setOnline = function(channel) {
    if(this.live.indexOf(channel.id) == -1) {
        this.live.push(channel.id);
        this.updateBadge();
    }
    this.panel.port.emit("setOnline", channel);
};

PanelList.prototype.setOffline = function(channel) {
    if(this.live.indexOf(channel.id) != -1) {
        this.live.splice(this.live.indexOf(channel.id), 1);
        this.updateBadge();

        if(this.live.length === 0) {
            emit("offline", this);
        }
    }
    this.panel.port.emit("setOffline", channel);
};

exports.ListView = function(live, style, extras) {
    return new PanelList(live, style, extras);
};

