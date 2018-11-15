/**
 * Model for the channels manager component.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/manager
 */
import {
    emit, when
} from "../../utils.js";
import Port from '../../port.js';
import serializedProviders from "../providers/serialized.js";

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
 * Shift clicked help button to export debug info.
 *
 * @event module:channel/manager.ChannelsManager#debugdump
 */
/**
 * Show add-on options.
 *
 * @event module:channel/manager.ChannelsManager#showoptions
 */

const ONE_ITEM = 1;

/**
 * @class
 * @extends external:EventTarget
 */
export default class ChannelsManager extends EventTarget {
    /**
     * @fires module:channel/manager.ChannelsManager#addchannel
     * @fires module:channel/manager.ChannelsManager#removechannel
     * @fires module:channel/manager.ChannelsManager#updatechannel
     * @fires module:channel/manager.ChannelsManager#adduser
     * @fires module:channel/manager.ChannelsManager#removeuser
     * @fires module:channel/manager.ChannelsManager#updatefavorites
     * @fires module:channel/manager.ChannelsManager#autoadd
     * @fires module:channel/manager.ChannelsManager#debugdump
     * @fires module:channel/manager.ChannelsManager#showoptions
     */
    constructor() {
        super();

        this.cancelingValues = new Map();

        this.port = new Port("manager");
        this.port.addEventListener("connect", ({ detail: port }) => {
            this.tabID = port.sender.tab.id;
            this.loading = false;
        });
        this.port.addEventListener("disconnect", () => {
            this.tabID = null;
        });
        this.ready = when(this.port, 'ready');
        this.port.addEventListener("message", ({ detail: message }) => {
            switch(message.command) {
            case "ready":
                this.setTheme();
                this.addProviders(serializedProviders);
                break;
            case "adduser":
                if(message.payload.username !== null) {
                    this.loading = true;
                    this.cancelingValues.set(`user${message.payload.type}${message.payload.username}`, false);
                    emit(this, "adduser", message.payload.username, message.payload.type,
                        () => this.cancelingValues.get(`user${message.payload.type}${message.payload.username}`));
                }
                break;
            case "addchannel":
                if(message.payload.username !== null) {
                    this.loading = true;
                    this.cancelingValues.set(`channel${message.payload.type}${message.payload.username}`, false);
                    emit(this, "addchannel", message.payload.username, message.payload.type,
                        () => this.cancelingValues.get(`channel${message.payload.type}${message.payload.username}`));
                }
                break;
            case "cancel":
                this.loading = false;
                this.cancelingValues.set(message.payload.join(""), true);
                break;
            case "removechannel":
                emit(this, "removechannel", message.payload);
                break;
            case "removeuser":
                emit(this, "removeuser", message.payload.userId, message.payload.removeFollows);
                break;
            case "updatefavorites":
            case "updatechannel":
            case "autoadd":
                this.loading = true;
                emit(this, message.command, message.payload);
                break;
            case "debugdump":
            case "showoptions":
                emit(this, message.command);
                break;
            default:
                // ignore
            }
        }, {
            passive: true
        });
        this.port.addEventListener("duplicate", ({ detail: port }) => {
            when(port, "ready")
                .then(() => port.send("secondary"))
                .catch(console.error);

            port.addEventListener("focus", () => {
                if(this.tabID !== null) {
                    this.open();
                    //TODO close duplicate?
                }
                else {
                    port.send("reload");
                }
            }, {
                passive: true
            });
        }, {
            passive: true
        });
    }

    port = null;
    tabID = null;

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

    _loading = true;

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

        return browser.tabs.update(this.tabID, {
            active: true
        });
    }
    /**
     * Add providers to the list of available providers in the manager.
     *
     * @param {Object.<module:providers/generic-provider.GenericProvider>} providers
     *                                  - Availabe providers in serialized form.
     * @returns {undefined}
     */
    addProviders(providers) {
        this._emitToWorker("addproviders", providers);
    }
    /**
     * Event callback if a channel was added. Callers should call
     * _deleteCancelingValue if invoked from the manager.
     *
     * @param {module:channel/core.Channel} channelObj - The added channel.
     * @returns {undefined}
     */
    onChannelAdded(channelObj) {
        this.loading = false;
        this._emitToWorker("add", channelObj.id);
    }
    /**
     * Callback when a channel was removed.
     *
     * @param {number} channelId - ID of the removed channel.
     * @returns {undefined}
     */
    onChannelRemoved(channelId) {
        this._emitToWorker("remove", channelId);
    }
    /**
     * Callback when a channel was updated.
     *
     * @param {module:channel/core.Channel} channelObj - The updated channel.
     * @returns {undefined}
     */
    onChannelUpdated(channelObj) {
        this.loading = false;
        this._emitToWorker("update", channelObj.id);
    }
    /**
     * Callback when a user was added. Callers should call _deleteCancelingValue
     * if invoked from the manager.
     *
     * @param {module:channel/core.User} user - The added user.
     * @returns {undefined}
     */
    onUserAdded(user) {
        this.loading = false;
        this._emitToWorker("adduser", user.id);
    }
    /**
     * Callback when a user was removed.
     *
     * @param {number} userId - The ID of the removed user.
     * @returns {undefined}
     */
    onUserRemoved(userId) {
        this._emitToWorker("removeuser", userId);
    }
    /**
     * Callback when a user was updated.
     *
     * @param {module:channel/core.User} user - The user that was updated.
     * @returns {undefined}
     */
    onUserUpdated(user) {
        this.loading = false;
        this._emitToWorker("updateuser", user.id);
    }

    /**
     * Request a permission to add a channel in the channel manager.
     *
     * @param {string} provider - Provider to request the permissions for.
     * @param {string} name - Channel or user to add.
     * @param {string} type - Type of thing to add.
     * @returns {boolean} If the required permissions were granted.
     */
    async requestPermissions(provider, name, type) {
        await this.ready;
        return this.port.request("requestpermission", [
            provider,
            name,
            type
        ]);
    }

    /**
     * Callback when an error occurs while adding something.
     *
     * @param {string} [name] - Name of the object that was to be added.
     * @param {string} [type] - Type of the object that was to be added.
     * @param {string} [itemType] - Type of the object that had an error
     *                            (user/channel).
     * @returns {undefined}
     */
    onError(name, type, itemType) {
        this.loading = false;
        if(name) {
            this._deleteCancelingValue(itemType, type, name);
            this._emitToWorker("error", name, type);
        }
        else {
            this._emitToWorker("error");
        }
    }
    /**
     * Listener to be called when an action is canceled.
     *
     * @param {string} [name] - Name of the object whose action was canceled.
     * @param {string} [type] - Type/provider of the object whose action was
     *        canceled.
     * @param {string} [itemType] - Type of the object whoese action was cacneled.
     * @returns {undefined}
     */
    onCancel(name, type, itemType) {
        this.loading = false;
        this._deleteCancelingValue(itemType, type, name);
    }

    /**
     * Set the theme of the channel manager.
     *
     * @param {string} [theme] - Theme ID of the theme to use.
     * @returns {undefined}
     */
    setTheme(theme = this._theme) {
        this._theme = theme;
        this._emitToWorker("theme", theme);
    }

    copyDump(dump) {
        this.port.reply("debugdump", dump);
    }

    /**
     * Cleans up the canceling value for a request.
     *
     * @param {string} type - Object type (user or channel).
     * @param {string} provider - Object provider name.
     * @param {string} name - Object login.
     * @returns {undefined}
     */
    _deleteCancelingValue(type, provider, name) {
        this.cancelingValues.delete(type + provider + name);
    }
    /**
     * Only emits to the worker if it actually exists (isn't null).
     *
     * @param {string} target - Name of the event to emit.
     * @param {?} data - Data to send.
     * @returns {undefined}
     */
    _emitToWorker(target, ...data) {
        if(data.length === ONE_ITEM) {
            data = data.pop();
        }
        this.port.send(target, data);
    }
}
