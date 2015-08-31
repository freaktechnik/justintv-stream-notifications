/**
 * A generic provider class
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/generic-provider
 */

"use strict";

/**
 * An SDK class that handles unloading
 * @external sdk/core/hertiage.Disposable
 * @requires sdk/core/disposable
 */
const { Disposable } = require("sdk/core/disposable"),
      { Class: newClass } = require("sdk/core/heritage"),
      { all, reject } = require("sdk/core/promise");

const { get: _ } = require("sdk/l10n");

const qs = require("../queueservice");

const methodNotSupported = (type, method) => reject(type+"."+method+" is not supported");

let queues = new WeakMap();
let queueFor = (provider) => queues.get(provider);

const GenericProvider = newClass(
    /** @lends GenericProvider.prototype */
    {
        implements: [
            Disposable
        ],
        /**
         * Generic base-class for all providers. Implements common patterns and helpers.
         * @constructs GenericProvider
         * @extends external:sdk/core/heritage.Disposable
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
         */
        _supportsFavorites: false,
        /**
         * Internal property specifying, if the provider can get the favorites of a
         * user based on stored credentials. The credentials checked are for the URLs
         * in the array the {@link GenericProvider#authURL} property specifies.
         * @type {boolean}
         * @protected
         * @see authURL
         */
        _supportsCredentials: false,
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
         * The human readable name of this provider, by default looks for a translated
         * string with the id "provider_type" where type is the value of _type.
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
                credentials: this._supportsCredentials
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
         * @return {Promise} A promise that resolves to an array with to elements in
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
         * @return {Promise} A promise that resolves to a Channel object with at least
         *         username, type, image and urls set.
         * @abstract
         */
        getChannelDetails: function(channelname) {
            return methodNotSupported(this.name, "getChannelDetails");
        },
        /**
         * @callback userCallback
         * @argument {channeluser.User} user - The updated User object.
         */
        /**
         * @callback newChannelsCallback
         * @argument {Array.<channeluser.Channel>} channels - An Array of new Channels.
         */
        /**
         * Queues a reocurring update request for updating the favorite channels of
         * the users.
         * @argument {Array.<channeluser.User>} users  - Users to update the favorites of.
         * @argument {userCallback} userCallback
         * @argument {newChannelsCallback} channelCallback
         * @abstract
         */
        updateFavsRequest: function(users, userCallback, channelCallback) {
            throw this.name+".updateFavsRequest is not supported.";
        },
        /**
         * Unqueues the reocurring update request for updating the favorite channels
         * of the users.
         */
        removeFavsRequest: function() {
            this._qs.unqueueUpdateRequest(this._qs.LOW_PRIORITY);
        },
        /**
         * @callback channelCallback
         * @argument {Array.<channeluser.Channel>} channels - The updated Channels.
         */
        /**
         * Queues a reocurring update request for updating the live status of all
         * channels for this provider.
         * @argument {Array.<channeluser.Channel>} channels - The Channel objects to update.
         * @argument {channelCallback} callback
         * @abstract
         */
        updateRequest: function(channels, callback) {
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
         * just calls getChannelDetails.
         * @argument {string} channelname - The username of the channel (typically
         *                                 the login property of a channel)
         * @return {Promise} A promise resolving to an updated Channel object.
         */
        updateChannel: function(channelname) {
            return this.getChannelDetails(channelname);
        },
        /**
         * Updates the information for an array of Channel objects, including their
         * live metadata. The default implementation calls {@link GenericProvider#updateChannel} for each item.
         * @argument {Array.<channeluser.Channel>} channels - An array of Channel objects.
         * @return {Promise} A promise resolving to an array of updated Channel objects.
         */
        updateChannels: function(channels) {
            return all(channels.map((channel) => this.updateChannel(channel.login)));
        }
    }
);

exports.GenericProvider = GenericProvider;
