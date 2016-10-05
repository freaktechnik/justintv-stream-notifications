/**
 * Model for the channels manager component.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/manager
 */
import { emit } from "../../utils";
import EventTarget from '../../event-target';

const MANAGER_URL = browser.runtime.getURL("manager/index.html");

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
 * @extends external:EventTarget
 */
export default class ChannelsManager extends EventTarget {
    _loading = true;
    port = null;
    tabID = null;
    /**
     * @constructs
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
    constructor() {
        super();

        this.cancelingValues = new Map();

        browser.runtime.onConnect.addListener((port) => {
            if(port.name == "manager") {
                this._setupPort(port);
            }
        });
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
            if(val) {
                this._emitToWorker("isloading");
            }
            else {
                this._emitToWorker("doneloading");
            }
        }
    }
    _setupPort(port) {
        console.log("[Manager]> Attached");
        const isSecondary = this.port !== null;

        if(!isSecondary) {
            this.port = port;
            this.tabID = port.sender.tab.id
            this.loading = true;
        }

        port.onDisconnect.addListener((message) => {
            this.port = null;
            this.tabID = null;
        });

        port.onMessage.addListener((message) => {
            if(message.target == "ready") {
                if(isSecondary) {
                    this._emitToWorker("secondary");
                }
                else {
                    console.log("[Manager]> Page ready");
                    emit(this, "getdata");
                }
            }
            else if(isSecondary && message.target == "focus") {
                if(this.tabID !== null) {
                    this.open();
                }
                else {
                    this._emitToWorker("reload");
                }
            }
            else if(message.target == "adduser") {
                if(message.username !== null) {
                    this.loading = true;
                    this.cancelingValues.set("user" + message.type + message.username, false);
                    emit(this, "adduser", message.username, message.type,
                         () => this.cancelingValues.get("user" + message.type + message.username));
                }
            }
            else if(message.target == "autoadd") {
                this.loading = true;
                emit(this, "autoadd");
            }
            else if(message.target == "addchannel") {
                if(message.username !== null) {
                    this.loading = true;
                    this.cancelingValues.set("channel" + message.type + message.username, false);
                    emit(this, "addchannel", message.username, message.type,
                         () => this.cancelingValues.get("channel" + message.type + message.username));
                }
            }
            else if(message.target == "cancel") {
                this.loading = false;
                this.cancelingValues.set(message.values.join(""), true);
            }
            else if(message.target == "removechannel") {
                emit(this, "removechannel", message.channelId);
            }
            if(message.target == "removeuser") {
                emit(this, "removeuser", message.userId, message.removeFavorites);
            }
            if(message.target == "updatechannel") {
                this.loading = true;
                emit(this, "updatechannel", message.channelId);
            }
            else if(message.target == "updatefavorites") {
                this.loading = true;
                emit(this, "updatefavorites", message.userId);
            }
            else if(message.target == "debugdump" || message.target == "showoptions") {
                emit(this, message.target);
            }
        });
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
     * @param {string} target - Name of the event to emit.
     * @param {?} data - Data to send.
     */
    _emitToWorker(target, ...data) {
        if(this.port !== null) {
            if(data.length == 1) {
                data = data[0];
            }
            this.port.postMessage({
                target,
                data
            });
        }
    }
    /**
     * Selects a manager tab, if one's already opened, else opens one.
     *
     * @async
     * @returns {?} The tab with the channels manager.
     */
    open() {
        if(this.tabID === null) {
            return browser.tabs.create({
                url: "./manager/index.html"
            }).then((tab) => {
                this.tabID = tab.id;
                return tab;
            });
        }
        else {
            return browser.tabs.update(this.tabID, {
                active: true
            });
        }
    }
    /**
     * Add providers to the list of available providers in the manager.
     *
     * @param {Object.<module:providers/generic-provider.GenericProvider>} providers
     *                                  - Availabe providers in serialized form.
     */
    addProviders(providers) {
        this._emitToWorker("addproviders", providers);
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
            //TODO move i18n to content
            this._emitToWorker("error", name, type);
        }
        else {
            this._emitToWorker("error");
        }
    }
    onCancel(name, type, itemType) {
        this.loading = false;
        this._deleteCancelingValue(itemType, type, name);
    }

    setTheme(theme) {
        this._emitToWorker("theme", theme);
    }
}
