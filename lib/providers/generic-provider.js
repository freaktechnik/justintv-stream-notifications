/**
 * A generic provider class
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/generic-provider
 * @requires module:queueservice
 */

"use strict";

/**
 * An SDK class that handles unloading
 * @external sdk/core/disposable
 * @requires sdk/core/disposable
 */
/**
 * @class Disposable
 * @memberof external:sdk/core/disposable
 */
const { Disposable } = require("sdk/core/disposable"),
/**
 * An SDK class that add event reqistration methods
 * @external sdk/event/target
 * @requires sdk/event/target
 */
/**
 * @class EventTarget
 * @memberof external:sdk/event/target
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/event_target#EventTarget}
 */
      { EventTarget } = require("sdk/event/target"),
      { Class: newClass } = require("sdk/core/heritage"),
      { prefs } = require("sdk/simple-prefs"),
      { all, reject } = require("sdk/core/promise");

const { get: _ } = require("sdk/l10n");

const qs = require("../queueservice");

const methodNotSupported = (type, method) => reject(type+"."+method+" is not supported");

let queues = new WeakMap();
let queueFor = (provider) => queues.get(provider);

/**
 * @event module:providers/generic-provider.GenericProvider#updateduser
 * @type {module:channeluser.User}
 */
/**
 * @event module:providers/generic-provider.GenericProvider#newchannels
 * @type {Array.<module:channeluser.Channel>}
 */
/**
 * @event module:providers/generic-provider.GenericProvider#updatedchannels
 * @type {Array.<module:channeluser.Channel>|module:channeluser.Channel}
 */

const GenericProvider = newClass(
    /** @lends module:providers/generic-provider.GenericProvider.prototype */
    {
        extends: EventTarget,
        implements: [
            Disposable
        ],
        /**
         * Generic base-class for all providers. Implements common patterns and helpers.
         * @constructs
         * @extends external:sdk/core/disposable.Disposable
         * @extends external:sdk/event/target.EventTarget
         * @argument {string} type
         */
        setup: function(type) {
            this._type = type;
            queues.set(this, qs.getServiceForProvider(this._type));
        },
        dispose: function() {
            this.removeRequest();
            if(this._supportsFavorites)
                this.removeFavsRequest();

            queues.delete(this);
        },
        /**
         * The type specified to the constructor
         * @type {string}
         * @protected
         */
        _type: "generic",
        /**
         * Internal property if the provider can get the favorites of a user.
         * @type {boolean}
         * @protected
         * @default false
         */
        _supportsFavorites: false,
        /**
         * Internal property specifying, if the provider can get the favorites
         * of a user based on stored credentials. The credentials checked are
         * for the URLs in the array the
         * {@link module:providers/generic-provider.GenericProvider#authURL}
         * property specifies.
         * @type {boolean}
         * @protected
         * @default false
         */
        _supportsCredentials: false,
        /**
         * Internal property specifying, if the provider can get a featured
         * channel on the platform.
         * @type {boolean}
         * @protected
         * @default false
         */
        _supportsFeatured: false,
        /**
         * An instance of the QueueService for this provider
         * @type {queueservice.QueueService}
         * @protected
         * @readonly
         */
        get _qs() {
            return queueFor(this);
        },
        /**
         * Indicates if exploring features should hold mature results.
         * @type {boolean}
         * @protected
         * @readonly
         */
        get _mature() {
            return prefs.find_mature;
        },
        /**
         * The human readable name of this provider, by default looks for a
         * translated string with the id "provider_type" where type is the value
         *  of _type.
         * @type {string}
         * @readonly
         */
        get name() {
            return _("provider_"+this._type);
        },
        /**
         * @return {string}
         */
        toString: function() {
            return this.name;
        },
        /**
         * An object based on the _supports properties.
         * @type {object.<string, boolean>}
         * @readonly
         */
        get supports() {
            return {
                favorites: this._supportsFavorites,
                credentials: this._supportsCredentials,
                featured: this._supportsFeatured
            };
        },
        /**
         * Array of URLs to search credentials for
         * @abstract
         * @type {Array.<string>}
         */
        authURL: [],
        /**
         * Get the favorite channels of a user. Also called the followed channels.
         * @argument {string} username - The username of the user on the platform
         *                               (as entered by the user in the channels
         *                               manager).
         * @return {Promise.<Array>} A promise that resolves to an array with to elements in
         *         this order:
         *            - the user (an instance of a User object)
         *            - the favorite channels, an array of Channels objects
         * @abstract
         */
        getUserFavorites: function(username) {
            return methodNotSupported(this.name, "getUserFavorites");
        },
        /**
         * Get a Channel object without the requirement of any live metadata.
         * @argument {string} channelname - The username of the channel to return
         *                    (as entered by the user in the channels manager).
         * @return {Promise.<module:channeluser.Channel>} A promise that
         *         resolves to a Channel object with at least username, type,
         *         image and urls set.
         * @abstract
         */
        getChannelDetails: function(channelname) {
            return methodNotSupported(this.name, "getChannelDetails");
        },
        /**
         * Queues a reocurring update request for updating the favorite channels
         * of the users.
         * @argument {Array.<module:channeluser.User>} users - Users to update the favorites of.
         * @fires module:providers/generic-provider.GenericProvider#updateduser
         * @fires module:providers/generic-provider.GenericProvider#newchannels
         * @abstract
         */
        updateFavsRequest: function(users) {
            throw this.name+".updateFavsRequest is not supported.";
        },
        /**
         * Unqueues the reocurring update request for updating the favorite
         * channels of the users.
         */
        removeFavsRequest: function() {
            this._qs.unqueueUpdateRequest(this._qs.LOW_PRIORITY);
        },
        /**
         * Queues a reocurring update request for updating the live status of all
         * channels for this provider.
         * @argument {Array.<module:channeluser.Channel>} channels - The Channel
         * objects to update.
         * @fires module:providers/generic-provider.GenericProvider#updatedchannels
         * @abstract
         */
        updateRequest: function(channels) {
            throw this.name+".updateRequest is not supported.";
        },
        /**
         * Unqueues the reocurring update request for updating the live status of
         * all channels for this provider.
         */
        removeRequest: function() {
            this._qs.unqueueUpdateRequest(this._qs.HIGH_PRIORITY);
        },
        /**
         * Updates all info for a channel, including its live metadata. By default
         * just calls {@link module:providers/generic-provider.GenericProvider#getChannelDetails}.
         * @argument {string} channelname - The login of the channel.
         * @return {Promise.<module:channeluser.Channel>} A promise resolving to
         *         an updated Channel object.
         */
        updateChannel: function(channelname) {
            return this.getChannelDetails(channelname);
        },
        /**
         * Updates the information for an array of Channel objects, including
         * their live metadata. The default implementation calls
         * {@link module:providers/generic-provider.GenericProvider#updateChannel}
         * for each item.
         * @argument {Array.<module:channeluser.Channel>} channels - An array of
         *                                                      Channel objects.
         * @return {Promise.<Array.<module:channeluser.Channel>>} A promise
         *                             resolving to the updated Channel objects.
         */
        updateChannels: function(channels) {
            return all(channels.map((channel) => this.updateChannel(channel.login)));
        },
        /**
         * Returns channels the provider is featuring.
         * @return {Promise.<Array.<module:channeluser.Channel>>} An array of
         *                                                    featured channels.
         * @abstract
         * @see {@link module:lib/providers/generic-provider.GenericProvider#_mature}
         */
        getFeaturedChannels: function() {
            return methodNotSupported(this.name, "getFeatured");
        },
        /**
         * Search for live channels
         * @argument {string} query - A string to search for.
         * @return {Promise.<Array.<module:channeluser.Channel>>} An array of
         *                                          channels matching the query.
         * @abstract
         * @see {@link module:lib/providers/generic-provider.GenericProvider#_mature}
         */
        search: function(query) {
            return methodNotSupported(this.name, "search");
        }
    }
);

exports.GenericProvider = GenericProvider;
