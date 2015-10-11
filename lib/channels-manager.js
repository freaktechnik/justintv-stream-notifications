/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 * Model for the channels manager component
 */

"use strict";

// setup event handling
var { emit, off }        = require("sdk/event/core"),
    { EventTarget } = require("sdk/event/target"),

    tabs            = require("sdk/tabs"),
    passwords       = require("sdk/passwords"),
    self            = require("sdk/self"),
    { PageMod }     = require("sdk/page-mod"),

    { all }         = require("sdk/core/promise"),
    { Task: { async } } = require("resource://gre/modules/Task.jsm");

var providers = require("./providers");

var list, loading;

const serializeProviders = (providers) => {
    let ret = {};
    for(let p in providers) {
        ret[p] = {
            name: providers[p].name,
            supports: providers[p].supports
        };
    }
    return ret;
};

function ChannelsManager(chlist) {
    list = chlist;

    var onCloseTab = (tab) => {
        console.log("[Manager]> Closed");
        this.managerTab = null;
    };

    let that = this;

    new PageMod({
        include: self.data.url("./channels-manager.html"),
        contentScriptFile: "./channels-manager.js",
        attachTo: ["existing", "top"],
        onAttach: (worker) => {
            all([
                list.getChannelsByType(null),
                list.getUsersByType(null)
            ]).then((chu) => {
                worker.port.emit("initdata", {
                    channels : chu[0],
                    users    : chu[1],
                    providers: serializeProviders(providers)
                });
            });
            worker.port.on("adduser", this.addUserFavorites.bind(this));
            worker.port.on("autoadd", () => {
                for(var provider in providers) {
                    this.getLoginName(provider);
                }
            });
            worker.port.on("addchannel", this.addChannel.bind(this));
            worker.port.on("removechannel", this.removeChannel.bind(this));
            worker.port.on("removeuser", async(function*(userId, removeFollows) {
                if(removeFollows) {
                    yield list.removeChannelsByUserFavorites(userId);
                }
                return that.removeUser(userId);
            }));
            worker.port.on("refreshchannel", this.refreshChannel.bind(this));
            worker.port.on("refreshuser", this.refreshUserFavorites.bind(this));

            worker.on("detach", () => {
                this.worker = null;
                if(this.managerTab) {
                    off(this.managerTab, "close", onCloseTab);
                    this.managerTab = null;
                }
                console.log("[Manager]> Detached");
            });
            this.worker = worker;
        }
    });

    for(var t in tabs) {
        if(tabs[t].url == self.data.url("./channels-manager.html")) {
            this.managerTab = tabs[t];
            this.managerTab.once("close", onCloseTab);
            break; // there can only be one.
        }
    }

    tabs.on("ready", (tab) => {
        if(tab.url == self.data.url("./channels-manager.html")) {
            this.managerTab = tab;
            this.managerTab.once("close", onCloseTab);
        }
    });

    require('./queueservice').addQueueListeners(() => {
        loading = true;
        if(this.worker)
            this.worker.port.emit("isloading");
    }, function() {
        loading = false;
    });
}

ChannelsManager.prototype = Object.create(EventTarget.prototype);

ChannelsManager.prototype.worker = null;
ChannelsManager.prototype.managerTab = null;

// singelton tab opener
ChannelsManager.prototype.open = function() {
    if(this.managerTab == null) {
        tabs.open({
            url: "./channels-manager.html"
        });
    }
    else {
        this.managerTab.activate();
    }
};

ChannelsManager.prototype.addChannel = function(name, type) {
    if(name != null) {
        return providers[type].getChannelDetails(name).then(list.addChannel.bind(list));
    }
};

ChannelsManager.prototype.removeChannel = function(channelId) {
    return list.removeChannel(channelId);
};

ChannelsManager.prototype.removeUser = function(userId) {
    return list.removeUser(userId);
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
        return providers[type].getUserFavorites(username).then(([user, channels]) => {
            list.addUser(user);
            list.addChannels(channels);
        });
};

// check the credentials for a credential.login for the provider
ChannelsManager.prototype.getLoginName = function(provider) {
    if(providers[provider].supports.credentials) {
        console.log("Searching login name for "+provider);
        let passwordSearchOnComplete = (credentials) => {
           credentials.forEach((credential) => {
               console.log("Found a credential for "+provider);
               this.addUserFavorites(credential.username, provider);
           });
        };
        providers[provider].authURL.forEach((url) => {
            passwords.search({
                url: url,
                onComplete: passwordSearchOnComplete
            });
        });
    }
};

ChannelsManager.prototype.refreshChannel = function(channelId) {
    return list.getChannel(channelId)
        .then((channel) => providers[channel.type].updateChannel(channel.login))
        .then(list.setChannel.bind(list));
};

ChannelsManager.prototype.refreshUserFavorites = async(function*(userId, type) {
    if(!type) {
        let usr = yield list.getUser(userId);
        type = usr.type;
        userId = usr.login;
    }

    if(providers[type].supports.favorites) {
        let [ user, channels ] = yield providers[type].getUserFavorites(userId);
        list.setUser(user);
        channels.forEach((channel) => {
            list.setChannel(channel);
        });
    }
});

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
