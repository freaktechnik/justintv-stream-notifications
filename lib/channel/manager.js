/**
 * Model for the channels manager component
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/manager
 */

"use strict";

const tabs = require("sdk/tabs"),
      self = require("sdk/self"),
     { PageMod } = require("sdk/page-mod"),
     { Task: { async } } = require("resource://gre/modules/Task.jsm"),
     { off, emit, setListeners } = require("sdk/event/core");
const { EventTarget } = require("sdk/event/target");
const { Class: newClass } = require("sdk/core/heritage");

var providers = require("../providers");
const serializedProviders = require("../providers/serialized");

var loading;

/**
 * Store a channel. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onChannelAdded} once the
 * channel was added.
 * @event module:channel/manager.ChannelsManager#addchannel
 * @type {string}
 */
/**
 * Remove a channel (given by its ID) and all users that have it as favorite.
 * Listeners should call
 * {@link module:channel/manager.ChannelsManager#onChannelRemoved} once the
 * channel has been removed.
 * @event module:channel/manager.ChannelsManager#removechannel
 * @type {number}
 */
/**
 * Update a channel (given by its ID). Listeners shoudl call
 * {@link module:channel/manager.ChannelsManager#onChannelUpdated} once the
 * channels has been updated.
 * @event module:channel/manager.ChannelsManager#updatechannel
 * @type {number}
 */
/**
 * Store a user. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onUserAdded} once the user has
 * been added.
 * @event module:channel/manager.ChannelsManager#adduser
 * @type {string}
 */
/**
 * Remove a user (given by it ID). If the second argument is true, delete all
 * its favorited channels, too. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onUserRemoved} once the user
 * was removed.
 * @event module:channel/manager.ChannelsManager#removeuser
 * @type {number}
 */
/**
 * Update the favorites of the given user (by ID) or all users, if no ID was
 * specified. Should call the approriate update callbacks on the ChannelsManager
 * once done.
 * @event module:channel/manager.ChannelsManager#updatefavorites
 * @type {number}
 */
/**
 * Search for accounts of the user on supported sites.
 * @event module:channel/manager.ChannelsManager#autoadd
 *
 */
/**
 * Add all existing channels and users via the on callbacks.
 * @event module:channel/manager.ChannelsManager#getdata
 */

const ChannelsManager = newClass(
/** @lends module:channel/manager.ChannelsManager.prototype */
{
    extends: EventTarget,
    /**
     * @constructs
     * @argument {Object} options - Event listeners.
     * @fires module:channel/manager.ChannelsManager#addchannel
     * @fires module:channel/manager.ChannelsManager#removechannel
     * @fires module:channel/manager.ChannelsManager#updatechannel
     * @fires module:channel/manager.ChannelsManager#adduser
     * @fires module:channel/manager.ChannelsManager#removeuser
     * @fires module:channel/manager.ChannelsManager#updatefavorites
     * @fires module:channel/manager.ChannelsManager#autoadd
     * @fires module:channel/manager.ChannelsManager#getdata
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
                worker.port.on("adduser", (username, type) => {
                    if(username !== null) {
                        this.loading = true;
                        emit(this, "adduser", username, type);
                    }
                });
                worker.port.on("autoadd", () => {
                    this.loading = true;
                    emit(this, "autoadd");
                });
                worker.port.on("addchannel", (name, type) => {
                    if(name !== null) {
                        this.loading = true;
                        emit(this, "addchannel", name, type);
                    }
                });
                worker.port.on("removechannel", (channelId) => {
                    emit(this, "removechannel", channelId);
                });
                worker.port.on("removeuser", (userId, removeFavorites) => {
                    emit(this, "removeuser", userId, removeFavorites);
                });
                worker.port.on("refreshchannel", (channelId) => {
                    this.loading = true;
                    emit(this, "updatechannel", channelId);
                });
                worker.port.on("refreshuser", (userId) => {
                    this.loading = true;
                    emit(this, "updatefavorites", userId);
                });

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
     * Event callback if a channel was added.
     * @argument {module:channel/core.Channel} channelObj - The added channel.
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
     * @argument {module:channel/core.Channel} channelObj - The updated channel.
     */
    onChannelUpdated(channelObj) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("update", channelObj.serialize());
    },
    /**
     * Callback when a user was added.
     * @argument {module:channel/core.User} user - The added user.
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
     * @argument {module:channel/core.User} user - The user that was updated.
     */
    onUserUpdated(user) {
        this.loading = false;
        if(this.worker)
            this.worker.port.emit("updateuser", user.serialize());
    }
});

exports.ChannelsManager = ChannelsManager;
