/* eslint-disable no-unused-vars,eslint-comments/disable-enable-pair */
/**
 * A generic provider class
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/generic-provider
 * @requires module:queue/service
 */
import prefs from "../../preferences";
import ParentalControls from "../parental-controls";
import * as qs from "../queue/service";
import EventTarget from 'event-target-shim';
import ProviderChannelList from '../channel/provider-list';
import { emit } from '../../utils';

const _ = browser.i18n.getMessage,
    methodNotSupported = (type, method) => Promise.reject(new Error(`${type}.${method} is not supported`)),
    queues = new WeakMap(),
    queueFor = (provider) => {
        if(!queues.has(provider)) {
            queues.set(provider, qs.getServiceForProvider(provider._type));
        }
        return queues.get(provider);
    },
    plists = new WeakMap(),
    listFor = (provider) => {
        if(!plists.has(provider)) {
            plists.set(provider, new ProviderChannelList(provider._type));
        }
        return plists.get(provider);
    };

/**
 * @event module:providers/generic-provider.GenericProvider#updateduser
 * @type {module:channel/core.User}
 */
/**
 * @event module:providers/generic-provider.GenericProvider#newchannels
 * @type {[module:channel/core.Channel]}
 */
/**
 * @event module:providers/generic-provider.GenericProvider#updatedchannels
 * @type {[module:channel/core.Channel]|module:channel/core.Channel}
 */
/**
 * @callback GetURLs
 * @async
 * @returns {[string]} Array of URLs to fetch.
 */
/**
 * @callback UpdateOnComplete
 * @async
 * @param {module:queue~Response} data - Request results.
 * @param {string} url
 * @returns {[module:channel/core.Channel]} Channels that were updated.
 */
/**
 * @typedef {Object} UpdateRequestConfig
 * @property {module:providers/generic-provider~GetURLs} getURLs - Returns a promise that resolves to the URLs to fetch.
 * @property {module:providers/generic-provider~UpdateOnComplete} onComplete - Returns the update channels from the request result.
 * @property {Object} [headers={}] - Headers to send with the request.
 */
/**
 * @callback FavsOnComplete
 * @async
 * @param {module:queue~Response} data - Request results.
 * @param {string} url
 * @returns {[module:channel/core.User, [module:channel/core.Channel]]} Updated user and new channels.
 */
/**
 * @typedef {Object} FavsRequestConfig
 * @property {module:providers/generic-provider~GetURLs} getURLs - Returns a promise that resolves to the URLs to fetch.
 * @property {module:providers/generic-provider~FavsOnComplete} onComplete - Returns the update channels from the request result.
 * @property {Object} [headers={}] - Headers to send with the request.
 */

/**
 * @extends external:Error
 */
/*class ProviderError extends Error {
    constructor(code) {
        let message;
        switch(code) {
        case 1: message = "The API did not accept the given request format"; break;
        case 2: message = "Could not access the requested resource"; break;
        case 3: message = "Could not find any result for the given username"; break;
        default: message = "Could not load the requested resource"; break;
        }
        super(message);
        this.code = code;
        this.name = "ProviderError";
    }
}*/

/**
 * @class
 * @extends module:disposable-target.Disposable
 */
export default class GenericProvider extends EventTarget {
    /*static get NETWORK_ERROR() {
        return new ProviderError(0);
    }
    static get API_ERROR() {
        return new ProviderError(1);
    }
    static get ACCESS_ERROR() {
        return new ProviderError(2);
    }
    static get NORESULT_ERROR() {
        return new ProviderError(3);
    }
    static getErrorByHTTPCode(code) {
        switch(code) {
        case 404:
        case 410:
        case 415:
        case 422:
            return this.NORESULT_ERROR;
        case 401:
        case 403:
        case 511:
            return this.ACCESS_ERROR;
        case 500:
        case 501:
        case 502:
        case 504:
        case 506:
        case 507:
        case 508:
        case 510:
        case 429:
            return this.API_ERROR;
        default:
            return this.NETWORK_ERROR;
        }
    }*/

    /**
     * Generic base-class for all providers. Implements common patterns and helpers.
     *
     * @constructs
     * @param {string} type - Provider type descriptor.
     */
    constructor(type) {
        super();
        /**
         * The type specified to the constructor.
         *
         * @type {string}
         * @protected
         */
        this._type = type;
    }

    /**
     * Array of URLs to search credentials for.
     *
     * @abstract
     * @type {[string]}
     */
    authURL = [];

    /**
     * If the provider is fully functional and should be enabled. Makes it
     * impossible to add new channels and users and disables the update
     * request queueing. Existing channels will be kept around, and could
     * still be updated. getChannelDetails is also expected to return a
     * channel that at least sets the login.
     *
     * @type {boolean}
     * @readonly
     */
    get enabled() {
        return this._enabled;
    }
    /**
     * The human readable name of this provider, by default looks for a
     * translated string with the id "provider_type" where type is the value of
     * _type.
     *
     * @type {string}
     * @readonly
     */
    get name() {
        return _(`provider${this._type}`);
    }

    /**
     * An object based on the _supports properties.
     *
     * @type {module:providers/generic-provider~ProviderSupports}
     * @readonly
     */
    get supports() {
        return Object.freeze({
            favorites: this._supportsFavorites && this._enabled,
            credentials: this._supportsCredentials && this._enabled,
            featured: this._supportsFeatured && this._enabled
        });
    }

    /**
     * Internal property if the provider can get the favorites of a user.
     *
     * @type {boolean}
     * @protected
     * @default false
     */
    _supportsFavorites = false;
    /**
     * Internal property specifying, if the provider can get the favorites
     * of a user based on stored credentials. The credentials checked are
     * for the URLs in the array the
     * {@link module:providers/generic-provider.GenericProvider#authURL}
     * property specifies.
     *
     * @type {boolean}
     * @protected
     * @default false
     */
    _supportsCredentials = false;
    /**
     * Internal property specifying, if the provider can get a featured
     * channel on the platform.
     *
     * @type {boolean}
     * @protected
     * @default false
     */
    _supportsFeatured = false;
    /**
     * The value of enabled.
     *
     * @type {boolean}
     * @protected
     * @readonly
     * @default true
     */
    _enabled = true;

    /**
     * An instance of the QueueService for this provider.
     *
     * @type {queueservice.QueueService}
     * @protected
     * @readonly
     */
    get _qs() {
        return queueFor(this);
    }

    get _list() {
        return listFor(this);
    }

    /**
     * Initialize the provider after construction. This is primarily a workaround
     * to classes not having a prototype and only defining properties in their
     * constructor.
     *
     * @returns {undefined}
     */
    initialize() {
        if(this.enabled) {
            this._list.getChannels()
                .then((channels) => {
                    if(channels.length) {
                        this._queueUpdateRequest();
                    }
                })
                .catch((e) => console.error("Error intializing channels for", this._type, e));
            if(this.supports.credentials) {
                this._list.getUsers()
                    .then((users) => {
                        if(users.length) {
                            this._queueFavsRequest();
                        }
                    })
                    .catch((e) => console.error("Error intializing users for", this._type, e));
            }
            this._list.addEventListener("channelsadded", () => {
                if(!this._qs.hasUpdateRequest(this._qs.HIGH_PRIORITY)) {
                    this._queueUpdateRequest();
                }
            });
            if(this.supports.credentials) {
                this._list.addEventListener("useradded", () => {
                    if(!this._qs.hasUpdateRequest(this._qs.LOW_PRIORITY)) {
                        this._queueFavsRequest();
                    }
                });
            }
        }
    }

    /**
     * @returns {string} Localized name of the provider.
     * @see {@link module:providers/generic-provider.GenericProvider#name}
     */
    toString() {
        return this.name;
    }

    /**
     * Frozen
     *
     * @typedef {Object} ProviderSupports
     * @property {boolean} favorites - Provider supports getting a user's favorites
     * @property {boolean} credentials - Provider supports credential based auto-detect of users
     * @property {boolean} featured - Provider supports getting featured channels and search
     */

    /**
     * Get the favorite channels of a user. Also called the followed channels.
     *
     * @async
     * @param {string} username - The username of the user on the platform
     *                            (as entered by the user in the channels
     *                            manager).
     * @returns {Array} A promise that resolves to an array with to elements in
     *          this order:
     *            - the user (an instance of a User object).
     *            - the favorite channels, an array of Channels objects.
     * @abstract
     */
    getUserFavorites(username) {
        return methodNotSupported(this.name, "getUserFavorites");
    }
    /**
     * Get a Channel object without the requirement of any live metadata.
     *
     * @async
     * @param {string} channelname - The username of the channel to return
     *                         (as entered by the user in the channels manager).
     * @returns {module:channel/core.Channel} Channel object with at least
     *          username, type, image and urls set.
     * @abstract
     */
    getChannelDetails(channelname) {
        return methodNotSupported(this.name, "getChannelDetails");
    }
    /**
     * Queues a reocurring update request for updating the favorite channels
     * of the users.
     *
     * @fires module:providers/generic-provider.GenericProvider#updateduser
     * @fires module:providers/generic-provider.GenericProvider#newchannels
     * @abstract
     * @returns {[module:channel/core.User, [module:channel/core.Channel]]} Updated user and new channels.
     * @async
     */
    updateFavsRequest() {
        return methodNotSupported(this.name, "updateFavsRequest");
    }
    /**
     * Unqueues the reocurring update request for updating the favorite
     * channels of the users.
     *
     * @returns {undefined}
     */
    removeFavsRequest() {
        this._qs.unqueueUpdateRequest(this._qs.LOW_PRIORITY);
    }
    /**
     * Queues a reocurring update request for updating the live status of all
     * channels for this provider.
     *
     * @fires module:providers/generic-provider.GenericProvider#updatedchannels
     * @abstract
     * @returns {[module:channel/core.Channel]} Updated channels.
     * @async
     */
    updateRequest() {
        return methodNotSupported(this.name, "updateRequest");
    }
    /**
     * Unqueues the reocurring update request for updating the live status of
     * all channels for this provider.
     *
     * @returns {undefined}
     */
    removeRequest() {
        this._qs.unqueueUpdateRequest(this._qs.HIGH_PRIORITY);
    }
    /**
     * Updates all info for a channel, including its live metadata. By default
     * just calls {@link module:providers/generic-provider.GenericProvider#getChannelDetails}.
     *
     * @async
     * @param {string} channelname - The login of the channel.
     * @returns {module:channel/core.Channel} Updated Channel object.
     */
    updateChannel(channelname) {
        return this.getChannelDetails(channelname);
    }
    /**
     * Updates the information for an array of Channel objects, including
     * their live metadata. The default implementation calls
     * {@link module:providers/generic-provider.GenericProvider#updateChannel}
     * for each item.
     *
     * @async
     * @param {[module:channel/core.Channel]} channels - An array of
     *                                                      channel objects.
     * @returns {[module:channel/core.Channel]} Updated Channel objects.
     */
    updateChannels(channels) {
        return Promise.all(channels.map((channel) => this.updateChannel(channel.login)));
    }
    /**
     * Returns channels the provider is featuring. Results should be
     * filtered if _mature is false. By default calls
     * {@link module:providers/generic-provider.GenericProvider#search} with
     * an empty string as argument.
     *
     * @async
     * @returns {[module:channel/core.Channel]} An array of featured
     *                                                channels.
     * @see {@link module:providers/generic-provider.GenericProvider#_mature}
     */
    getFeaturedChannels() {
        return this.search("");
    }
    /**
     * Search for live channels. Results should be filtered if _mature is
     * false.
     *
     * @async
     * @param {string} query - A string to search for.
     * @returns {[module:channel/core.Channel]} An array of channels
     *                                                matching the query.
     * @abstract
     * @see {@link module:lib/providers/generic-provider.GenericProvider#_mature}
     */
    search(query) {
        return methodNotSupported(this.name, "search");
    }

    // For testing.
    _setQs(val) {
        queues.set(this, val);
    }

    /**
     * Indicates if exploring features should hold mature results. Respects
     * parental control settings of the OS.
     *
     * @returns {boolean} Explore features should hold mature results if true.
     * @protected
     * @async
     */
    _mature() {
        return prefs.get("find_mature").then((value) => value && !ParentalControls.enabled);
    }

    /**
     * @private
     * @fires module:providers/generic-provider.GenericProvider#updatedchannels
     * @returns {undefined}
     */
    _queueUpdateRequest() {
        const config = this.updateRequest();
        this._qs.queueUpdateRequest({
            getURLs: config.getURLs,
            onComplete: (...args) => config.onComplete(...args).then((channels) => {
                if(channels) {
                    emit(this, "updatedchannels", channels);
                }
                return channels;
            }),
            priority: this._qs.HIGH_PRIORITY,
            headers: "headers" in config ? config.headers : {}
        });
    }

    /**
     * @private
     * @fires module:providers/generic-provider.GenericProvider#updateduser
     * @fires module:providers/generic-provider.GenericProvider#newchannels
     * @returns {undefined}
     */
    _queueFavsRequest() {
        const config = this.updateFavsRequest();
        this._qs.queueUpdateRequest({
            getURLs: config.getURLs,
            onComplete: (...args) => config.onComplete(...args).then(([
                user,
                channels
            ]) => {
                if(user) {
                    if(Array.isArray(user)) {
                        for(const u of user) {
                            emit(this, 'updateduser', u);
                        }
                    }
                    else {
                        emit(this, "updateduser", user);
                    }
                    if(channels.length) {
                        emit(this, "newchannels", channels);
                    }
                }
            }),
            priority: this._qs.LOW_PRIORITY,
            headers: "headers" in config ? config.headers : {}
        });
    }
}
