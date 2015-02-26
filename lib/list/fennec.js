/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Android Listview adapter
 */

"use strict";

const { HomePanel, Section, Types } = require("jetpack-homepanel"),
      _                             = require('sdk/l10n').get;

// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

PanelList.prototype.section = null;
PanelList.prototype.panel   = null;
PanelList.prototype.liveChannels = [];
PanelList.prototype.thumbnails = false;
function PanelList(live, style) {
    let that = this;

    this.thumbnails = style == 2;
    this.liveChannels = [];
    this.createSection();

    this.panel = new HomePanel({
        title: _("live_widget_label"),
        sections: [ that.section ]
    });
}
PanelList.prototype = Object.create(EventTarget.prototype);
PanelList.prototype.constructor = PanelList;

PanelList.prototype.createSection = function() {
    let that = this;
    this.section = new Section({
        type: that.thumbnails ? Types.GRID : Types.LIST,
        data: that.liveChannels.map(that.getItemFromChannel.bind(that)),
        empty: {
            text: _("live_widget_label_offline")
        }
    });
    this.section.on("refresh", function() {
        emit(that, "refresh");
        //TODO make sure something sets data at some point
    });
};

PanelList.prototype.setLiveState = function() {};

PanelList.prototype.setStyle = function(style) {
    this.thumbnails = 2 == style;
    this.createSection();
    this.panel.sections = [ that.section ];
};

PanelList.prototype.setExtras = function(extras) {};

PanelList.prototype.addChannels = function(channels) {
    channels.forEach(function(channel) {
        if(channel.live) {
            this.liveChannels.push(channel);
            this.section.addData(this.getItemFromChannel(channel));
        }
    }, this);
};

PanelList.prototype.getItemFromChannel = function(channel) {
    return {
        url: channel.url[0],
        title: channel.uname,
        description: channel.title,
        image_url: that.thumbnails ? channel.thumbnail : channel.getBestImageForSize(95)
    };
};

PanelList.prototype.setSectionData = function() {
    this.section.data = this.liveChannels.map(this.getItemFromChannel.bind(this));
};

PanelList.prototype.removeChannel = function(channelId) {
    this.liveChannels.splice(this.liveChannels.findIndex((ch) => ch.id == channel.id), 1);
    if(this.liveChannels.length == 0) {
        this.section.clear();
        emit(this, "offline");
    }
    else {
        this.setSectionData();
    }
};

PanelList.prototype.setOnline = function(channel) {
    let index;
    if((index = this.liveChannels.findIndex((ch) => ch.id == channel.id))) {
        this.liveChannels[index] = channel;
        this.setSectionData();
    }
    else {
        this.addChannels([channel]);
    }
};

PanelList.prototype.setOffline = function(channel) {
    this.removeChannel(channel.id);
};


exports.ListView = function(live, style) {
    return new PanelList(live, style);
};

