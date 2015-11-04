/**
 * Model for the channels manager component
 * @author Martin Giger
 * @license MPL-2.0
 * @module channels-manager
 */

"use strict";

const tabs = require("sdk/tabs"),
      passwords = require("sdk/passwords"),
      self = require("sdk/self"),
     { PageMod } = require("sdk/page-mod"),
     { all } = require("sdk/core/promise"),
     { Task: { async } } = require("resource://gre/modules/Task.jsm"),
     { off } = require("sdk/event/core");

var providers = require("./providers");
const serializedProviders = require("./providers/serialized");

var list, loading;

/**
 * @constructor
 * @argument {module:channellist.ChannelList} chlist - ChannelList to use.
 * @alias module:channels-manager.ChannelsManager
 */
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
            ]).then(([channels, users]) => {
                worker.port.emit("initdata", {
                    channels : channels.map((c) => c.serialize()),
                    users    : users.map((u) => u.serialize()),
                    providers: serializedProviders
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

/**
 * @type {SDKWorker}
 * @private
 */
ChannelsManager.prototype.worker = null;
/**
 * @type {external:sdk/tabs.Tab?}
 * @private
 */
ChannelsManager.prototype.managerTab = null;

/**
 * Selects a manager tab, if one's already opened, else opens one.
 */
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

/**
 * Add a channel. Gets the channel info from the provider and saves it to the
 * ChanneList.
 * @argument {string} name - Login of the channel.
 * @argument {string} type - Type of the channel.
 * @return {Promise.<module:channeluser.Channel>} Resolves to the added channel.
 */
ChannelsManager.prototype.addChannel = function(name, type) {
    if(name != null) {
        return providers[type].getChannelDetails(name).then(list.addChannel.bind(list));
    }
};

/**
 * Remove a channel. Removes it from the ChannelList. Removes all users
 * who favorited this channel.
 * @argument {number} channelId - ID of the channel to remove.
 * @return {Promise.<module:channeluser.Channel>} Resolves to the removed
 *                                                channel.
 */
ChannelsManager.prototype.removeChannel = function(channelId) {
    return list.removeChannel(channelId);
};

/**
 * Remove a user. Removes it from the ChannelList.
 * @argument {number} userId - ID of the user to remove.
 * @return {Promise.<module:channeluser.User>} Resolve to the removed user.
 */
ChannelsManager.prototype.removeUser = function(userId) {
    return list.removeUser(userId);
};

/**
 * Update the favorites of all users.
 */
ChannelsManager.prototype.updateFavorites = function() {
    var users = list.getUsersByType();
    users.forEach(function(user) {
        if(providers[user.type].supports.favorites)
            this.refreshUserFavorites(user.login, user.type);
    }, this);
};

/**
 * Add a user and its favorited channels.
 * @argument {string} username - Login of the user.
 * @argument {string} type - Type of the user.
 * @return {Promise}
 */
ChannelsManager.prototype.addUserFavorites = function(username,type) {
    if(username != null && providers[type].supports.favorites)
        return providers[type].getUserFavorites(username).then(([user, channels]) => {
            list.addUser(user);
            list.addChannels(channels);
        });
};

/**
 * Check the stored credentials for users of the given provider. Adds the found
 * users and their favorites to the ChannelList.
 * @argument {string} provider - Type to find users for.
 */
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

/**
 * Refresh the status and info of a channel and store it in the ChannelList.
 * @argument {number} channelId - ID of the channel to refresh.
 * @return {Promise.<module:channeluser.Channel>}
 */
ChannelsManager.prototype.refreshChannel = function(channelId) {
    return list.getChannel(channelId)
        .then((channel) => providers[channel.type].updateChannel(channel.login))
        .then(list.setChannel.bind(list));
};

/**
 * Refresh the info of a user and its favorites list. New favorites and the
 * updated user are stored in the ChannelList.
 * @argument {(number|string)} userId - ID or login of the user.
 * @argument {string} type - Type of the user if the ID wasn't specified.
 * @method
 * @return {Promise}
 */
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

/**
 * Event callback if a channel was added.
 * @argument {module:channeluser.Channel} channelObj - The added channel.
 */
ChannelsManager.prototype.onChannelAdded = function(channelObj) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("add", channelObj.serialize());
};
/**
 * Callback when a channel was removed.
 * @argument {number} channelId - ID of the removed channel.
 */
ChannelsManager.prototype.onChannelRemoved = function(channelId) {
    if(this.worker)
        this.worker.port.emit("remove", channelId);
};
/**
 * Callback when a channel was updated.
 * @argument {module:channeluser.Channel} channelObj - The updated channel.
 */
ChannelsManager.prototype.onChannelUpdated = function(channelObj) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("update", channelObj.serialize());
};
/**
 * Callback when a user was added.
 * @argument {module:channeluser.User} user - The added user.
 */
ChannelsManager.prototype.onUserAdded = function(user) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("adduser", user.serialize());
};
/**
 * Callback when a user was removed.
 * @argument {number} userId - The ID of the removed user.
 */
ChannelsManager.prototype.onUserRemoved = function(userId) {
    if(this.worker)
        this.worker.port.emit("removeuser", userId);
};
/**
 * Callback when a user was updated.
 * @argument {module:channeluser.User} user - The user that was updated.
 */
ChannelsManager.prototype.onUserUpdated = function(user) {
    this.doneLoading();
    if(this.worker)
        this.worker.port.emit("updateuser", user.serialize());
};
/**
 * Indicate, that all info has been loaded. Removes the loading status that is
 * applied whenever the user adds or updates an item.
 */
ChannelsManager.prototype.doneLoading = function() {
    if(this.worker && !loading)
        this.worker.port.emit("doneloading");
};

exports.ChannelsManager = ChannelsManager;
