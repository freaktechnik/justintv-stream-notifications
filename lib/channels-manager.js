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
    self            = require("sdk/self"),
    { PageMod }     = require("sdk/page-mod");

var providers = require("./providers");

var list, loading;

function ChannelsManager(chlist) {
    list = chlist;

    var that = this;
    PageMod({
        include: self.data.url("./channels-manager.html")+"*",
        contentScriptFile: "./channels-manager.js",
        attachTo: ["existing", "top"],
        onAttach: function(worker) {
                list.getChannelsByType(null, function(channels) {
                    list.getUsersByType(null, function(users) {
                        worker.port.emit("initdata", {
                            channels : channels,
                            users    : users,
                            providers: providers
                        });
                    });
                });
                worker.port.on("adduser", that.addUserFavorites.bind(that));
                worker.port.on("autoadd", () => {
                    for(var provider in providers) {
                        that.getLoginName(provider);
                    }
                });
                worker.port.on("addchannel", that.addChannel.bind(that));
                worker.port.on("removechannel", that.removeChannel.bind(that));
                worker.port.on("removeuser", that.removeUser.bind(that));
                worker.port.on("refreshchannel", that.refreshChannel.bind(that));
                worker.port.on("refreshuser", that.refreshUserFavorites.bind(that));
                worker.port.on("close", function() {
                    that.managerTab.close();
                });
                worker.on("detach", function() {
                    that.worker = null;
                });
                that.worker = worker;
            }
    });
    for(var t in tabs) {
        if(tabs[t].url == self.data.url("./channels-manager.html")) {
            this.managerTab = tabs[t];
            this.managerTab.on("close", function onClose(tab) {
                that.managerTab = null;
            });
        }
    }

    require('./queueservice').addQueueListeners(function() {
        loading = true;
        if(that.worker)
            that.worker.port.emit("isloading");
    }, function() {
        loading = false;
    });
}

ChannelsManager.prototype = Object.create(EventTarget.prototype);

ChannelsManager.prototype.worker;
ChannelsManager.prototype.managerTab = null;

// singelton tab opener
ChannelsManager.prototype.open = function() {
    if(this.managerTab == null) {
        var that = this;
        tabs.open({
            url: "./channels-manager.html",
            onClose: function onClose(tab) {
                that.managerTab = null;
            },
            onLoad: function onLoad(tab) {
                that.managerTab = tab;
            },
            onPageshow: function onPageshow(tab) {
                that.managerTab = tab;
            }
        });
    }
    else {
        this.managerTab.activate();
    }
};

ChannelsManager.prototype.addChannel = function(name, type) {
    if(name != null) {
        providers[type].getChannelDetails(name, list.addChannel.bind(list));
    }
};

ChannelsManager.prototype.removeChannel = function(channelId) {
    list.removeChannel(channelId);
};

ChannelsManager.prototype.removeUser = function(userId) {
    list.removeUser(userId);
};

ChannelsManager.prototype.updateFavorites = function() {
    var users = list.getUsersByType();
    users.forEach(function(user) {
        if(providers[user.type].supports.favorites)
            this.refreshUserFavorites(user.login, user.type);
    }, this);
};

ChannelsManager.prototype.addUserFavorites = function(username,type) {
    if(username != null && providers[type].supports.favorites)
        providers[type].getUserFavorites(username, list.addUser.bind(list), list.addChannels.bind(list));
};

// check the credentials for a credential.login for the provider
ChannelsManager.prototype.getLoginName = function(provider) {
    if(providers[provider].supports.credentials) {
        console.debug("Searching login name for "+provider);
        var that = this;
        providers[provider].authURL.forEach(function(url) {
            passwords.search({
                url: url,
                onComplete: (function(credentials) {
                    credentials.forEach(function(credential) {
                        console.debug("Found a credential for "+provider);
                        this.addUserFavorites(credential.username, provider);
                    }, this);
                }).bind(that)
            });
        });
    }
};

ChannelsManager.prototype.refreshChannel = function(channelId) {
    list.getChannel(function(channel) {
        providers[channel.type].updateChannel(channel.login, list.setChannel.bind(list));
    }, channelId);
};

ChannelsManager.prototype.refreshUserFavorites = function(userId, type) {
    if(!type) {
        list.getUser((function(user) {
            this.refreshUserFavorites(user.login, user.type);
        }).bind(this), userId);
        return;
    }
    if(providers[type].supports.favorites) {
        providers[type].getUserFavorites(userId, list.setUser.bind(list), function(channels) {
            channels.forEach(function(channel) {
                list.setChannel(channel);
            });
        });
    }
};

ChannelsManager.prototype.onChannelAdded = function(channelObj) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("add", channelObj);
};
ChannelsManager.prototype.onChannelRemoved = function(channelId) {
    if(this.worker)
        this.worker.port.emit("remove", channelId);
};
ChannelsManager.prototype.onChannelUpdated = function(channelObj) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("update", channelObj);
};
ChannelsManager.prototype.onUserAdded = function(user) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("adduser", user);
};
ChannelsManager.prototype.onUserRemoved = function(userId) {
    if(this.worker)
        this.worker.port.emit("removeuser", userId);
};
ChannelsManager.prototype.onUserUpdated = function(user) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("updateuser", user);
};

ChannelsManager.prototype.doneLoading = function() {
    if(this.worker && !loading)
        this.worker.port.emit("doneloading");
};

exports.ChannelsManager = ChannelsManager;
