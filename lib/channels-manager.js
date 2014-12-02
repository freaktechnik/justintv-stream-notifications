/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Model for the channels manager component
 */
 
"use strict";

// setup event handling 
var { emit }        = require("sdk/event/core"),
    { EventTarget } = require("sdk/event/target"),

    tabs            = require("sdk/tabs"),
    passwords       = require("sdk/passwords"),
    self            = require("sdk/self");

var { ChannelList } = require("./channellist"),
    providers = require("./providers");

const list = new ChannelList();

function ChannelsManager() {
    list.on('channelsadded', (function(channelObj) {
        this.worker.port.emit("add", channelObj);
    }).bind(this));
    list.on('channeldeleted', (function(channelId) {
        this.worker.port.emit("remove", channelId);
    }).bind(this));
    list.on('channelupdated', (function(channelObj) {
        this.worker.port.emit("update", channelObj);
    }).bind(this));
    list.on('useradded', (function(user) {
        this.worker.port.emit("adduser", user);
    }).bind(this));
    list.on('userdeleted', (function(userId) {
        this.worker.port.emit("removeuser", userId);
    }).bind(this));
}

ChannelsManager.prototype = Object.create(EventTarget.prototype);

ChannelsManager.prototype.worker;
ChannelsManager.prototype.managerTab = null;

// check if a manager tab has been sessionrestored

// singelton tab opener
ChannelsManager.prototype.open = function() {
    if(this.managerTab == null) {
        var that = this,
             destroyWorker = function(tab) {
                if(tab.url == self.data.url("./channels-manager.html")) {
                    that.worker = tab.attach({
                        contentScriptFile: "./channels-manager.js"
                    });
                    list.getChannelsByType(null, function(channels) {
                        list.getUsersByType(null, function(users) {
                            that.worker.port.emit("initdata", {
                                channels : channels,
                                users    : users,
                                providers: providers 
                            });
                        });
                    });
                    that.managerTab = tab;
                    that.worker.port.on("adduser",    that.addUserFavorites.bind(that));
                    that.worker.port.on("autoadd",    that.getLoginName.bind(that));
                    that.worker.port.on("addchannel", that.addChannel.bind(that));
                }
                else {
                    console.log("Destroying worker");
                    that.worker.destroy();
                }
            };
        tabs.open({
            url: "./channels-manager.html",
            onClose: function onClose(tab) {
                that.worker.destroy();
                that.managerTab = null;
            },
            onLoad:     destroyWorker,
            onPageshow: destroyWorker
        });
    }
    else {
        this.managerTab.activate();
    }
};

ChannelsManager.prototype.addChannel = function(name, type) {
    providers[type].getChannelDetails(name, list.addChannel.bind(list));
};

ChannelsManager.prototype.updateFavorites = function() {
    var users = list.getUsersByType();
    users.forEach(function(user) {
        this.addUserFavorites(user.login, user.type);
    }, this);
};

ChannelsManager.prototype.addUserFavorites = function(username,type) {
    providers[type].getUserFavorites(username, list.addChannels.bind(list));
    // also need to add the user with its favs
    this.worker.port.emit(this, "adduserfavorites", username, type);
};

// check the credentials for a credential.login for the provider
ChannelsManager.prototype.getLoginName = function(provider) {
    console.log("Searching login name for "+provider);
    var that = this;
    passwords.search({
        url: providers[provider].authURL,
        onComplete: (function(credentials) {
            credentials.forEach(function(credential) {
                console.log("Found a credential for "+provider);
                this.addUserFavorites(provider, credential.username);
            });
        }).bind(that)
    });
};

exports.ChannelsManager = ChannelsManager;

