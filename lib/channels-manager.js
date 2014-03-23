/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var tabs = require("sdk/tabs");
var self = require("sdk/self");
var passwords = require("sdk/passwords");

var instance;
exports = {
    get ChannelsManager() {
        if(!instance)
            instance = new ChannelsManager();

        return instance;
    }
};

function ChannelsManager() {

}

ChannelsManager.prototype = Object.create(EventTarget.prototype);

ChannelsManager.prototype.worker;
ChannelsManager.prototype.managerTab = null;

ChannelsManager.prototype.channelList;
ChannelsManager.prototype.providers;

// check if a manager tab has been sessionrestored

// singelton tab opener
ChannelsManager.prototype.open = function() {
    if(this.managerTab == null) {
        tabs.open({
            url:self.data.url("channels-manager.html"),
            onOpen: function onOpen(tab) {
                this.managerTab = tab;
                this.worker = tab.attach({
                    contentScriptFile: self.data.url("channels-manager.js")
                });
            },
            onClose: function onClose(tab) {
                this.managerTab = null;
            }
        });
    }
    else {
        this.managerTab.activate();
    }
};

ChannelsManager.prototype.setChannelList = function(channellist, providers) {
    this.channelList = channellist;
    this.providers = providers;

    var that = this;
    this.channelList.on('channeladded', function(channelObj) {
        that.worker.sendMessage("add", channelObj); // "update"
    });
    this.channelList.on('channeldeleted', function(channelObj) {
        that.worker.sendMessage("remove", channelObj);
    });
};

ChannelsManager.prototype.updateFavorites = function() {
    for(var provider in this.providers) {
        this.addUserFavorites(provider);
    }
    exports.getLoginName();
};

ChannelsManager.prototype.addUserFavorites = function(username,type) {
    if(this.channelList.users[username].sources.onlySourceSet(s))
        emit(this, "adduserfavorites", username, type);
        //this.channelList.users[username].requestID = queue.addRequest(providers[type].getUserFavorites({page:0}),false,processUserFavorites),true,true,10);
};

// check the credentials for a credential.login for the provider
ChannelsManager.prototype.getLoginName = function(provider) {
    console.log("Searching login name for "+provider);
    passwords.search({
        url: this.providers[provider].authURL,
        onComplete: function(credentials) {
            credentials.forEach(function(credential) {
                console.log("Found a credential for "+provider);
                if(this.channelList.addUser(credential.username))
                    emit(this, "adduserfavorites", credential.username, provider);
                    //channellist.users[provider][credential.username].requestID = queue.addRequest(providers[provider].getUserFavorites({'page':0},false,processUserFavorites),true,true,10);
            });
        }
    });
};
