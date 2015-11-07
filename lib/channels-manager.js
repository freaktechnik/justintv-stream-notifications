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
     { Task: { async } } = require("resource://gre/modules/Task.jsm"),
     { off, emit, setListeners } = require("sdk/event/core");
const { EventTarget } = require("sdk/event/target");
const { Class: newClass } = require("sdk/core/heritage");

var providers = require("./providers");
const serializedProviders = require("./providers/serialized");

var loading;

/**
 * Store a channel. Listeners should call
 * {@link module:channels-manager.ChannelsManager#onChannelAdded} once the
 * channel was added.
 * @event module:channels-manager.ChannelsManager#addchannel
 * @type {module:channeluser.Channel}
 */
/**
 * Store multiple channels. Listeners should call
 * {@link module:channels-manager.ChannelsManager#onChannelAdded} for each added
 * channels once they were added.
 * @event module:channels-manager.ChannelsManager#addchannels
 * @type {Array.<module:channeluser.Channel>}
 */
/**
 * Remove a channel (given by its ID) and all users that have it as favorite.
 * Listeners should call
 * {@link module:channels-manager.ChannelsManager#onChannelRemoved} once the
 * channel has been removed.
 * @event module:channels-manger.ChannelsManager#removechannel
 * @type {number}
 */
/**
 * Update a channel (given by its ID). Listeners shoudl call
 * {@link module:channels-manager.ChannelsManager#onChannelUpdated} once the
 * channels has been updated.
 * @event module:channels-manager.ChannelsManager#updatechannel
 * @type {number}
 */
/**
 * Store a user. Listeners should call
 * {@link module:channels-manager.ChannelsManager#onUserAdded} once the user has
 * been added.
 * @event module:channels-manager.ChannelsManager#adduser
 * @type {module:channeluser.User}
 */
/**
 * Remove a user (given by it ID). If the second argument is true, delete all
 * its favorited channels, too. Listeners should call
 * {@link module:channels-manager.ChannelsManager#onUserRemoved} once the user
 * was removed.
 * @event module:channels-manager.ChannelsManager#removeuser
 * @type {number}
 */
/**
 * Update the favorites of the given user (by ID) or all users, if no ID was
 * specified. Should call the approriate update callbacks on the ChannelsManager
 * once done.
 * @event module:channels-manager.ChannelsManager#updatefavorites
 * @type {number?}
 */
/**
 * Add all existing channels and users via the on callbacks.
 * @event module:channels-manager.ChannelsManager#getdata
 */

const ChannelsManager = newClass(
/** @lends module:channels-manager.ChannelsManager */
{
    extends: EventTarget,
    /**
     * @constructs
     * @argument {Object} options - Event listeners.
     */
    initialize(options) {
        setListeners(this, options);

        var onCloseTab = (tab) => {
            console.log("[Manager]> Closed");
            this.managerTab = null;
        };

        new PageMod({
            include: self.data.url("./channels-manager.html") + "*",
            contentScriptFile: "./channels-manager.js",
            attachTo: ["existing", "top"],
            onAttach: (worker) => {
                console.log("[Manager]> Attached");
                worker.port.on("ready", () => {
                    console.log("[Manager]> Page ready");
                    emit(this, "getdata");
                    worker.port.emit("initdata", {
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
                worker.port.on("removeuser", this.removeUser.bind(this));
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
    },
    /**
     * @type {SDKWorker}
     * @private
     */
    worker: null,
    /**
     * @type {external:sdk/tabs.Tab?}
     * @private
     */
    managerTab: null,
    _loading: true,
    /**
     * @type {boolean}
     * @private
     */
    get loading() {
        return this._loading;
    },
    set loading(val) {
        if(this._loading != val) {
            this._loading = val;
            if(this.worker) {
                if(val)
                    this.worker.port.emit("isloading");
                else
                    this.worker.port.emit("doneloading");
            }
        }
    },
    /**
     * Selects a manager tab, if one's already opened, else opens one.
     */
    open() {
        if(this.managerTab === null) {
            tabs.open({
                url: "./channels-manager.html"
            });
        }
        else {
            this.managerTab.activate();
        }
    },
    /**
     * Add a channel. Gets the channel info from the provider.
     * @argument {string} name - Login of the channel.
     * @argument {string} type - Type of the channel.
     * @fires module:channels-manager.ChannelsManager#addchannel
     */
    addChannel(name, type) {
        if(name !== null) {
            this.loading = true;
            providers[type].getChannelDetails(name)
                .then((channel) => emit(this, "addchannel", channel));
        }
    },
    /**
     * Remove a channel. Removes all users who favorited this channel.
     * @argument {number} channelId - ID of the channel to remove.
     * @fires module:channels-manager.ChannelsManager#removechannel
     */
    removeChannel(channelId) {
        emit(this, "removechannel", channelId);
    },
    /**
     * Remove a user.
     * @argument {number} userId - ID of the user to remove.
     * @argument {boolean} removeFollows - If channels the user follows should
     *                                                           be removed too.
     * @fires module:channels-manager.ChannelsManager#removeuser
     */
    removeUser(userId, removeFollows) {
        emit(this, "removeuser", userId, removeFollows);
    },
    /**
     * Update the favorites of all users.
     * @fires module:channels-manager.ChannelsManager#updatefavorites
     */
    updateFavorites() {
        this.loading = true;
        emit(this, "updatefavorites");
    },
    /**
     * Add a user and its favorited channels.
     * @argument {string} username - Login of the user.
     * @argument {string} type - Type of the user.
     * @fires module:channels-manager.ChannelsManager#adduser
     * @fires module:channels-manager.ChannelsManager#addchannels
     */
    addUserFavorites(username, type) {
        if(username !== null && providers[type].supports.favorites) {
            this.loading = true;
            providers[type].getUserFavorites(username).then(([user, channels]) => {
                emit(this, "adduser", user);
                emit(this, "addchannels", channels);
            });
        }
    },
    /**
     * Check the stored credentials for users of the given provider. Adds the
     * found users and their favorites.
     * @argument {string} provider - Type to find users for.
     * @fires module:channels-manager.ChannelsManager#adduser
     * @fires module:channels-manager.ChannelsManager#addchannels
     */
    getLoginName(provider) {
        if(providers[provider].supports.credentials) {
            this.loading = true;
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
    },
    /**
     * Refresh the status and info of a channel.
     * @argument {number} channelId - ID of the channel to refresh.
     * @fires module:channels-manager.ChannelsManager#updatechannel
     */
    refreshChannel(channelId) {
        this.loading = true;
        emit(this, "updatechannel", channelId);
    },
    /**
     * Refresh the info of a user and its favorites.
     * @argument {number} userID - ID of the user.
     * @fires module:channels-manager.ChannelsManager#updatefavorites
     */
    refreshUserFavorites(userId) {
        this.loading = true;
        emit(this, "updatefavorites", userId);
    },
    /**
     * Event callback if a channel was added.
     * @argument {module:channeluser.Channel} channelObj - The added channel.
     */
    onChannelAdded(channelObj) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("add", channelObj.serialize());
    },
    /**
     * Callback when a channel was removed.
     * @argument {number} channelId - ID of the removed channel.
     */
    onChannelRemoved(channelId) {
        if(this.worker)
            this.worker.port.emit("remove", channelId);
    },
    /**
     * Callback when a channel was updated.
     * @argument {module:channeluser.Channel} channelObj - The updated channel.
     */
    onChannelUpdated(channelObj) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("update", channelObj.serialize());
    },
    /**
     * Callback when a user was added.
     * @argument {module:channeluser.User} user - The added user.
     */
    onUserAdded(user) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("adduser", user.serialize());
    },
    /**
     * Callback when a user was removed.
     * @argument {number} userId - The ID of the removed user.
     */
    onUserRemoved(userId) {
        if(this.worker)
            this.worker.port.emit("removeuser", userId);
    },
    /**
     * Callback when a user was updated.
     * @argument {module:channeluser.User} user - The user that was updated.
     */
    onUserUpdated(user) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("updateuser", user.serialize());
    }
});

exports.ChannelsManager = ChannelsManager;
