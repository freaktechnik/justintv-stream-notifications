/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module read-channel-list
 * @todo Unify Errors that other lists might re-use.
 */
import { when } from "./utils";
import DatabaseManager, { ListClosedError } from './database-manager';
import EventTarget from 'event-target-shim';

/**
 * @class module:read-channel-list.ReadChannelList
 * @extends external:EventTarget
 */
export default class ReadChannelList extends EventTarget {
    /**
     * Database name.
     *
     * @type {string}
     * @readonly
     * @default "channellist"
     */
    static get name() {
        return DatabaseManager.name;
    }
    /**
     * @param {boolean} [passivelyOpen=false] - If this DB should not open the DB
     * explicitly.
     * @constructs
     * @fires module:read-channel-list.ReadChannelList#ready
     */
    constructor(passivelyOpen = false) {
        super();

        DatabaseManager.registerList(this);

        if(!passivelyOpen) {
            DatabaseManager.open();
        }
    }

    get idCache() { // eslint-disable-line class-methods-use-this
        return DatabaseManager.idCache;
    }

    get error() { // eslint-disable-line class-methods-use-this
        return DatabaseManager.error;
    }

    /**
     * Handle indexedDB requests as promise.
     *
     * @private
     * @async
     * @param {external:IDBRequest} request - Request to wait for.
     * @returns {?} Whatever the request's success param is.
     * @throws Error when the request fails.
     */
    _waitForRequest(request) { // eslint-disable-line class-methods-use-this
        return DatabaseManager._waitForRequest(request);
    }

    /**
     * @callback CursorIterator
     * @param {external:IDBCursor} cursor
     * @returns {Promise?} Can return a promise. When a promise is returned,
     * the iteration is continued after the promise resolves, else it is
     * immediately continued.
     */

    /**
     * Sibling of _waitForRequest for cursor requests. Iterates over a cursor
     * and then resolves.
     *
     * @private
     * @async
     * @param {external:IDBCursorRequest} request - Request to iterate with.
     * @param {module:read-channel-list~CursorIterator} callback - Callback for each iteration.
     * @returns {undefined} When the iteration is finished.
     * @throws When the iteration is aborted due to an error.
     */
    _waitForCursor(request, callback) { // eslint-disable-line class-methods-use-this
        return new Promise((resolve, reject) => { // eslint-disable-line promise/avoid-new
            request.onsuccess = (event) => {
                if(event.target.result) {
                    const r = callback(event.target.result);
                    if(r && typeof r === "object" && "then" in r) {
                        r.then(() => event.target.result.continue()).catch(reject);
                    }
                    else {
                        event.target.result.continue();
                    }
                }
                else {
                    resolve();
                }
            };
            request.onerror = reject;
        });
    }

    filterEvents() { // eslint-disable-line class-methods-use-this
        return true;
    }

    get db() { // eslint-disable-line class-methods-use-this
        return DatabaseManager.db;
    }

    get _ready() {
        return DatabaseManager.ready.catch((e) => {
            if(e instanceof ListClosedError) {
                return when(this, "ready");
            }
            throw e;
        });
    }

    /**
     * Gets the ID of a channel, if it is in the ChannelList.
     *
     * @param {string} name - Login of the channel.
     * @param {string} type - Type of the channel.
     * @returns {number} The ID of the channel if it exists.
     */
    async getChannelId(name, type) {
        await this._ready;
        if(this.idCache.has(type + name)) {
            return Promise.resolve(this.idCache.get(type + name));
        }

        const transaction = this.db.transaction("channels"),
            index = transaction.objectStore("channels").index("typename"),
            req = index.get([
                type,
                name
            ]);
        return this._waitForRequest(req).then(() => {
            if(req.result) {
                this.idCache.set(type + name, req.result.id);
                return req.result.id;
            }
            throw new Error("Could not fetch channel for the given info");
        });
    }

    /**
     * Gets the ID of a user, if it is in the ChannelList.
     *
     * @param {string} name - Login of the user.
     * @param {string} type - Type of the user.
     * @returns {number} The ID of the user (if it exsits).
     */
    async getUserId(name, type) {
        await this._ready;
        const transaction = this.db.transaction("users"),
            index = transaction.objectStore("users").index("typename"),
            req = index.get([
                type,
                name
            ]);
        return this._waitForRequest(req).then(() => {
            if(req.result) {
                return req.result.id;
            }
            throw new Error("Could not find any result for the given user info");
        });
    }

    /**
     * Get the specified channel.
     *
     * @param {(number|string)} id - ID of login of the channel.
     * @param {string} [type] - Type of the channel if a login was passed as
     *                             first argument.
     * @returns {Object} Requested channel instance.
     * @throws The channel doesn't exist or no arguments passed.
     */
    async getChannel(id, type) {
        await this._ready;
        if(type) {
            id = await this.getChannelId(id, type);
        }
        if(!id) {
            throw new Error("No ID specified");
        }

        const transaction = this.db.transaction("channels"),
            store = transaction.objectStore("channels"),
            req = store.get(id);
        await this._waitForRequest(req);
        if(req.result) {
            return req.result;
        }
        throw new Error("No result for the given ID");
    }

    /**
     * Get the specified user.
     *
     * @param {(number|string)} id - ID of login of the user.
     * @param {string} [type] - Type of the user if a login was passed as first
     *                             argument.
     * @returns {Object} Requested user instance.
     * @throws The user doesn't exist or no arguments passed.
     */
    async getUser(id, type) {
        await this._ready;
        if(type) {
            id = await this.getUserId(id, type);
        }

        if(!id) {
            throw new Error("No ID specified");
        }

        const transaction = this.db.transaction("users"),
            store = transaction.objectStore("users"),
            req = store.get(id);
        await this._waitForRequest(req);
        if(req.result) {
            return req.result;
        }
        throw new Error("Could not fetch specified user");
    }

    /**
     * Check if a channel is in the ChannelList.
     *
     * @param {(number|string)} id - ID or login of the channel.
     * @param {string} [type] - Type of the channel if no ID was passed.
     * @async
     * @returns {boolean} Resolves to a boolean indicating if the channel exists.
     */
    channelExists(id, type) {
        return this.getChannel(id, type).then((channel) => !!channel, () => false);
    }

    /**
     * Check if a user is in the ChannelList.
     *
     * @param {(number|string)} id - ID or login of the user.
     * @param {string} [type] - Type of the user if no ID was passed.
     * @async
     * @returns {boolean} Resolves to a boolean indicating if the user exists.
     */
    userExists(id, type) {
        return this.getUser(id, type).then((channel) => !!channel, () => false);
    }

    /**
     * Get all channels with the specified type.
     *
     * @param {string} [type] - Type all the channels should have. If left out,
     *                             all channels are returned.
     * @returns {Array.<Object>} Array of all channels for
     *          the given type. May be empty.
     */
    async getChannelsByType(type) {
        await this._ready;
        const transaction = this.db.transaction("channels"),
            store = transaction.objectStore("channels"),
            retchans = [];
        let request;
        if(!type) {
            request = store.index("typename").openCursor();
        }
        else {
            const keyRange = IDBKeyRange.only(type);
            request = store.index("type").openCursor(keyRange);
        }
        await this._waitForCursor(request, (cursor) => {
            retchans.push(cursor.value);
        });
        return retchans;
    }

    /**
     * Get all users in the ChannelList with a certain type.
     *
     * @param {string} [type] - The type all returned users should have. If left
     *                             out all users are returned.
     * @returns {Array.<Object>} Array of users for the given
     *          type. May be empty.
     */
    async getUsersByType(type) {
        await this._ready;
        const transaction = this.db.transaction("users"),
            store = transaction.objectStore("users"),
            retusrs = [];

        let request;
        if(!type) {
            request = store.index("typename").openCursor();
        }
        else {
            const keyRange = IDBKeyRange.only(type),
                index = store.index("type");
            request = index.openCursor(keyRange);
        }
        await this._waitForCursor(request, (cursor) => {
            retusrs.push(cursor.value);
        });
        return retusrs;
    }

    /**
     * Get all users that have the given channel as a favorite.
     *
     * @param {module:channel/core.Channel} channel - Channel to search users's
     *                                                  favorites for.
     * @returns {Array.<Object>} List of users that follow the
     *          given channel.
     */
    async getUsersByFavorite(channel) {
        const users = await this.getUsersByType(channel.type);
        return users.filter((user) => user.favorites.includes(channel.login));
    }

    /**
     * Get all channels that are favorited by a user.
     *
     * @param {module:channel/core.User} user - User to get the favorites of.
     * @returns {Array.<Object>} List of channels a user
     *          follows.
     */
    async getChannelsByUserFavorites(user) {
        const channels = await this.getChannelsByType(user.type);
        return channels.filter((channel) => user.favorites.some((channame) => channame == channel.login));
    }

    /**
     * Close the DB.
     *
     * @async
     * @returns {undefined} DB is being deleted, or may already be deleted.
     * @fires module:read-channel-list.ReadChannelList#close
     */
    close() { // eslint-disable-line class-methods-use-this
        return DatabaseManager.close();
    }
}
