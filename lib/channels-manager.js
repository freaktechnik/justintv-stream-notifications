/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var tabs = require("sdk/tabs");
var passwords = require("sdk/passwords");

var { ChannelList } = require("./channellist");
var providers = require("./providers");

const instance = new ChannelsManager();;
exports = {
    get ChannelsManager() {
        return instance;
    }
};

function ChannelsManager() {
    var that = this;
    ChannelList.on('channelsadded', function(channelObj) {
        that.worker.sendMessage("add", channelObj);
    });
    ChannelList.on('channeldeleted', function(channelObj) {
        that.worker.sendMessage("remove", channelObj);
    });
    ChannelList.on('channelupdated', function(channelObj) {
        that.worker.sendMessage("update", channelObj);
    });
}

ChannelsManager.prototype = Object.create(EventTarget.prototype);

ChannelsManager.prototype.worker;
ChannelsManager.prototype.managerTab = null;

// check if a manager tab has been sessionrestored

// singelton tab opener
ChannelsManager.prototype.open = function() {
    if(this.managerTab == null) {
        var that = this;
        tabs.open({
            url: "./channels-manager.html",
            onOpen: function onOpen(tab) {
                that.managerTab = tab;
                that.worker = tab.attach({
                    contentScriptFile: "./channels-manager.js"
                });
            },
            onClose: function onClose(tab) {
                that.managerTab = null;
            }
        });
    }
    else {
        this.managerTab.activate();
    }
};

ChannelsManager.prototype.updateFavorites = function() {
    var users = ChannelList.getUsersByType();
    users.forEach(function(user) {
        this.addUserFavorites(user.login, user.type);
    }, this);
};

ChannelsManager.prototype.addUserFavorites = function(username,type) {
    providers[type].getUserFavorites(username);
    emit(this, "adduserfavorites", username, type);
};

// check the credentials for a credential.login for the provider
ChannelsManager.prototype.getLoginName = function(provider) {
    console.log("Searching login name for "+provider);
    var that = this;
    passwords.search({
        url: providers[provider].authURL,
        onComplete: function(credentials) {
            credentials.forEach(function(credential) {
                console.log("Found a credential for "+provider);
                that.addUserFavorites(provider, credential.username);
            });
        }
    });
};
