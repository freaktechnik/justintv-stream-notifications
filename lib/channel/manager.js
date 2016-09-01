/**
 * Model for the channels manager component.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/manager
 */
import tabs from "sdk/tabs";
import self from "sdk/self";
import { PageMod } from "sdk/page-mod";
import { off, emit } from "sdk/event/core";
import { MatchPattern } from "sdk/util/match-pattern";
import Disposable from "../disposable-target";
import { get as _ } from "sdk/l10n";
import { when } from "sdk/event/utils";

const MANAGER_URL_PATTERN = self.data.url("./channels-manager.html") + "*";

/**
 * Store a channel. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onChannelAdded} once the
 * channel was added.
 *
 * @event module:channel/manager.ChannelsManager#addchannel
 * @type {string}
 */
/**
 * Remove a channel (given by its ID) and all users that have it as favorite.
 * Listeners should call
 * {@link module:channel/manager.ChannelsManager#onChannelRemoved} once the
 * channel has been removed.
 *
 * @event module:channel/manager.ChannelsManager#removechannel
 * @type {number}
 */
/**
 * Update a channel (given by its ID). Listeners shoudl call
 * {@link module:channel/manager.ChannelsManager#onChannelUpdated} once the
 * channels has been updated.
 *
 * @event module:channel/manager.ChannelsManager#updatechannel
 * @type {number}
 */
/**
 * Store a user. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onUserAdded} once the user has
 * been added.
 *
 * @event module:channel/manager.ChannelsManager#adduser
 * @type {string}
 */
/**
 * Remove a user (given by it ID). If the second argument is true, delete all
 * its favorited channels, too. Listeners should call
 * {@link module:channel/manager.ChannelsManager#onUserRemoved} once the user
 * was removed.
 *
 * @event module:channel/manager.ChannelsManager#removeuser
 * @type {number}
 */
/**
 * Update the favorites of the given user (by ID) or all users, if no ID was
 * specified. Should call the approriate update callbacks on the ChannelsManager
 * once done.
 *
 * @event module:channel/manager.ChannelsManager#updatefavorites
 * @type {number}
 */
/**
 * Search for accounts of the user on supported sites.
 *
 * @event module:channel/manager.ChannelsManager#autoadd
 *
 */
/**
 * Add all existing channels and users via the on callbacks.
 *
 * @event module:channel/manager.ChannelsManager#getdata
 */
/**
 * Shift clicked help button to export debug info.
 *
 * @event module:channel/manager.ChannelsManager#debugdump
 */
/**
 * Show add-on options.
 *
 * @event module:channel/manager.ChannelsManager#showoptions
 */

/**
 * @class
 * @extends module:disposable-target.Disposable
 */
export default class ChannelsManager extends Disposable {
    /**
     * @type {SDKWorker}
     * @private
     */
    worker = null;
    /**
     * @type {external:sdk/tabs.Tab?}
     * @private
     */
    managerTab = null;
    _loading = true;
    /**
     * @constructs
     * @param {Object} options - Event listeners.
     * @fires module:channel/manager.ChannelsManager#addchannel
     * @fires module:channel/manager.ChannelsManager#removechannel
     * @fires module:channel/manager.ChannelsManager#updatechannel
     * @fires module:channel/manager.ChannelsManager#adduser
     * @fires module:channel/manager.ChannelsManager#removeuser
     * @fires module:channel/manager.ChannelsManager#updatefavorites
     * @fires module:channel/manager.ChannelsManager#autoadd
     * @fires module:channel/manager.ChannelsManager#getdata
     * @fires module:channel/manager.ChannelsManager#debugdump
     * @fires module:channel/manager.ChannelsManager#showoptions
     */
    constructor(options) {
        super(options);

        const onCloseTab = () => {
                console.log("[Manager]> Closed");
                this.managerTab = null;
            },
            detach = () => {
                this.worker = null;
                if(this.managerTab !== null) {
                    off(this.managerTab, "close", onCloseTab);
                    this.managerTab = null;
                }
                console.log("[Manager]> Detached");
            },
            pattern = new MatchPattern(MANAGER_URL_PATTERN);

        this.cancelingValues = new Map();

        /**
         * @type {external:sdk/page-mod.PageMod}
         * @private
         */
        this.mod = new PageMod({
            include: MANAGER_URL_PATTERN,
            contentScriptFile: "./channels-manager.js",
            attachTo: [ "existing", "top" ],
            onAttach: (worker) => {
                console.log("[Manager]> Attached");
                const isSecondary = this.worker !== null;

                worker.port.once("ready", () => {
                    if(isSecondary) {
                        worker.port.emit("secondary");
                    }
                    else {
                        console.log("[Manager]> Page ready");
                        emit(this, "getdata");
                    }
                });

                if(isSecondary) {
                    worker.port.on("focus", () => {
                        if(this.managerTab !== null) {
                            this.open();
                        }
                        else {
                            worker.port.emit("reload");
                        }
                    });
                    return;
                }

                this.loading = true;

                worker.port.on("adduser", (username, type) => {
                    if(username !== null) {
                        this.loading = true;
                        this.cancelingValues.set("user" + type + username, false);
                        emit(this, "adduser", username, type,
                             () => this.cancelingValues.get("user" + type + username));
                    }
                });
                worker.port.on("autoadd", () => {
                    this.loading = true;
                    emit(this, "autoadd");
                });
                worker.port.on("addchannel", (name, type) => {
                    if(name !== null) {
                        this.loading = true;
                        this.cancelingValues.set("channel" + type + name, false);
                        emit(this, "addchannel", name, type,
                             () => this.cancelingValues.get("channel" + type + name));
                    }
                });
                worker.port.on("cancel", (itemType, type, name) => {
                    this.loading = false;
                    this.cancelingValues.set(itemType + type + name, true);
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
                worker.port.on("debugdump", () => emit(this, "debugdump"));
                worker.port.on("showoptions", () => emit(this, "showoptions"));

                worker.port.once("unload", () => {
                    worker.detach();
                });
                worker.once("detach", detach);
                this.worker = worker;
            }
        });

        for(let t in tabs) {
            if(pattern.test(tabs[t].url)) {
                this.managerTab = tabs[t];
                this.managerTab.once("close", onCloseTab);
                break; // there can only be one.
            }
        }

        this._readyListener = (tab) => {
            if(pattern.test(tab.url) && this.managerTab === null) {
                this.managerTab = tab;
                this.managerTab.once("close", onCloseTab);
            }
        };

        tabs.on("ready", this._readyListener);
    }
    /**
     * @type {boolean}
     * @private
     */
    get loading() {
        return this._loading;
    }
    set loading(val) {
        if(this._loading != val) {
            this._loading = val;
            if(this.worker) {
                if(val) {
                    this.worker.port.emit("isloading");
                }
                else {
                    this.worker.port.emit("doneloading");
                }
            }
        }
    }
    /**
     * Cleans up the canceling value for a request.
     *
     * @param {string} type - Object type (user or channel).
     * @param {string} provider - Object provider name.
     * @param {string} name - Object login.
     */
    _deleteCancelingValue(type, provider, name) {
        this.cancelingValues.delete(type + provider + name);
    }
    /**
     * Only emits to the worker if it actually exists (isn't null).
     *
     * @param {string} event - Name of the event to emit.
     * @param {?} data - Data to send.
     */
    _emitToWorker(event, ...data) {
        if(this.worker !== null) {
            this.worker.port.emit(event, ...data);
        }
    }
    /**
     * Selects a manager tab, if one's already opened, else opens one.
     *
     * @async
     * @returns {Tab} The tab with the channels manager.
     */
    open() {
        if(this.managerTab === null) {
            const promise = when(tabs, "ready");
            tabs.open({
                url: "./channels-manager.html"
            });
            return promise;
        }
        else {
            const promise = when(this.managerTab, "activate");
            this.managerTab.activate();
            return promise.then(() => this.managerTab);
        }
    }
    /**
     * Add providers to the list of available providers in the manager.
     *
     * @param {Object.<module:providers/generic-provider.GenericProvider>} providers
     *                                  - Availabe providers in serialized form.
     */
    addProviders(providers) {
        if(this.worker) {
            this.worker.port.emit("addproviders", providers);
        }
    }
    /**
     * Event callback if a channel was added. Callers should call
     * _deleteCancelingValue if invoked from the manager.
     *
     * @param {module:channel/core.Channel} channelObj - The added channel.
     */
    onChannelAdded(channelObj) {
        this.loading = false;
        this._emitToWorker("add", channelObj.serialize());
    }
    /**
     * Callback when a channel was removed.
     *
     * @param {number} channelId - ID of the removed channel.
     */
    onChannelRemoved(channelId) {
        this._emitToWorker("remove", channelId);
    }
    /**
     * Callback when a channel was updated.
     *
     * @param {module:channel/core.Channel} channelObj - The updated channel.
     */
    onChannelUpdated(channelObj) {
        this.loading = false;
        this._emitToWorker("update", channelObj.serialize());
    }
    /**
     * Callback when a user was added. Callers should call _deleteCancelingValue
     * if invoked from the manager.
     *
     * @param {module:channel/core.User} user - The added user.
     */
    onUserAdded(user) {
        this.loading = false;
        this._emitToWorker("adduser", user.serialize());
    }
    /**
     * Callback when a user was removed.
     *
     * @param {number} userId - The ID of the removed user.
     */
    onUserRemoved(userId) {
        this._emitToWorker("removeuser", userId);
    }
    /**
     * Callback when a user was updated.
     *
     * @param {module:channel/core.User} user - The user that was updated.
     */
    onUserUpdated(user) {
        this.loading = false;
        this._emitToWorker("updateuser", user.serialize());
    }
    /**
     * Callback when an error occurs while adding something.
     *
     * @param {string} [name] - Name of the object that was to be added.
     * @param {string} [type] - Type of the object that was to be added.
     * @param {string} [itemType] - Type of the object that had an error
     *                            (user/channel).
     */
    onError(name, type, itemType) {
        this.loading = false;
        if(name) {
            this._deleteCancelingValue(itemType, type, name);
            this._emitToWorker("error", _("cm_dialog_error", name, type));
        }
        else {
            this._emitToWorker("error", _("cm_dialog_generic_error"));
        }
    }
    onCancel(name, type, itemType) {
        this.loading = false;
        this._deleteCancelingValue(itemType, type, name);
    }

    setTheme(theme) {
        this._emitToWorker("theme", theme);
    }

    dispose() {
        if(this.managerTab !== null) {
            this.managerTab.close();
        }
        tabs.off("ready", this._readyListener);
        this.mod.destroy();
        this.cancelingValues.clear();
    }
}
