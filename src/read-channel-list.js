/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module read-channel-list
 * @todo Unify Errors that other lists might re-use.
 */
// setup event handling
import { emit } from "./utils";
import EventTarget from 'event-target-shim';

/**
 * IndexedDB version.
 *
 * @const {number}
 * @default 2
 */
const VERSION = 3,
    /**
     * Database name.
     *
     * @const {string}
     * @default "channellist"
     */
    NAME = "channellist";

/**
 * The ChannelList is ready to be used.
 *
 * @event module:read-channel-list.ReadChannelList#ready
 */
/**
 * The ChannelList's DB connection was closed.
 *
 * @event module:read-channel-list.ReadChannelList#close
 */

export class FixListError extends Error {
    constructor() {
        super("Could not open list, please fix");
    }
}

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
        return NAME;
    }
    /**
     * Reference to the DB
     *
     * @type {IndexedDB?}
     */
    db = null;
    /**
     * Holds a promise until the DB is being opened.
     *
     * @type {Promise?}
     */
    _openingDB = null;
    /**
     * @constructs
     * @fires module:read-channel-list.ReadChannelList#ready
     */
    constructor() {
        super();

        this.idCache = new Map();

        this.openDB(NAME);
    }

    /**
     * Opens the DB, initializes the schema if it's a new DB or sets channels
     * offline that were online and have last been updated a certain time ago.
     *
     * @param {string} [name=ReadChannelList.name] - Name of the DB to open.
     * @param {boolean} [dontTry=false] - Don't try to fix the DB.
     * @async
     * @fires module:read-channel-list.ReadChannelList#ready
     * @returns {undefined} The DB is ready.
     * @throws Could not open the DB. Has a boolean that is true when a clear
     *         should be tried.
     */
    openDB(name = ReadChannelList.name, dontTry = false) {
        // Quick path if DB is already opened.
        if(this.db) {
            return Promise.resolve();
        }
        else if(this._openingDB !== null) {
            return this._openingDB;
        }

        this._openingDB = new Promise((resolve, reject) => {
            // Try to open the DB
            const request = window.indexedDB.open(name, VERSION);
            request.onupgradeneeded = (e) => {
                this.db = e.target.result;

                if(e.oldVersion != 1 && e.oldVersion != 2) {
                    const users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true }),
                        channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
                    users.createIndex("typename", [ "type", "login" ], { unique: true });
                    users.createIndex("type", "type", { unique: false });
                    //users.createIndex("id", "id", { unique: true });
                    channels.createIndex("typename", [ "type", "login" ], { unique: true });
                    channels.createIndex("type", "type", { unique: false });
                    //channels.createIndex("id", "id", { unique: true });
                }
                else if(e.oldVersion === 2) {
                    const channels = e.target.transaction.objectStore("channels"),
                        request = channels.openCursor();
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if(cursor) {
                            const channel = cursor.value;
                            if(channel.live.alternateUsername || channel.live.alternateURL) {
                                channel.live.state = -1;
                            }
                            if(channel.live.alternateUsername) {
                                delete channel.live.alternateUsername;
                            }
                            if(channel.live.alternateURL) {
                                delete channel.live.alternateURL;
                            }
                            const r = cursor.update(channel);
                            r.onerror = reject;
                            cursor.continue();
                        }
                    };
                    request.onerror = reject;
                }
            };

            // DB is ready
            request.onsuccess = (e) => {
                this.db = e.target.result;

                this.db.addEventListener("close", () => {
                    emit(this, "close");
                }, {
                    passive: true,
                    capture: false
                });

                resolve();
                emit(this, "ready");
            };

            /* istanbul ignore next */
            request.onerror = () => {
                console.error(request.error);
                if(!dontTry) {
                    if(this.db) {
                        this.db.close();
                        delete this.db;
                    }
                    console.error("Couldn't delete the DB");
                    reject(new FixListError(request.error));
                }
                else {
                    reject(request.error);
                }
            };
        });
        // Clear it once the promise is done.
        this._openingDB.then(() => {
            this._openingDB = null;
        }, () => {
            this._openingDB = null;
        });
        return this._openingDB;
    }

    /**
     * Gets the ID of a channel, if it is in the ChannelList.
     *
     * @param {string} name - Login of the channel.
     * @param {string} type - Type of the channel.
     * @async
     * @returns {number} The ID of the channel if it exists.
     */
    getChannelId(name, type) {
        return new Promise((resolve, reject) => {
            if(this.idCache.has(type + name)) {
                resolve(this.idCache.get(type + name));
            }
            else {
                const transaction = this.db.transaction("channels"),
                    index = transaction.objectStore("channels").index("typename"),
                    req = index.get([ type, name ]);
                req.onsuccess = () => {
                    if(req.result) {
                        this.idCache.set(type + name, req.result.id);
                        resolve(req.result.id);
                    }
                    else {
                        reject(new Error("Could not fetch channel for the given info"));
                    }
                };
                req.onerror = reject;
            }
        });
    }

    /**
     * Gets the ID of a user, if it is in the ChannelList.
     *
     * @param {string} name - Login of the user.
     * @param {string} type - Type of the user.
     * @async
     * @returns {number} The ID of the user (if it exsits).
     */
    getUserId(name, type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users"),
                index = transaction.objectStore("users").index("typename"),
                req = index.get([ type, name ]);
            req.onsuccess = () => {
                if(req.result) {
                    resolve(req.result.id);
                }
                else {
                    reject(new Error("Could not find any result for the given user info"));
                }
            };
            req.onerror = reject;
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
        if(type) {
            id = await this.getChannelId(id, type);
        }
        if(!id) {
            throw new Error("No ID specified");
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels"),
                store = transaction.objectStore("channels"),
                req = store.get(id);

            req.onsuccess = () => {
                if(req.result) {
                    resolve(req.result);
                }
                else {
                    reject(new Error("No result for the given ID"));
                }
            };
            req.onerror = reject;
        });
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
        if(type) {
            id = await this.getUserId(id, type);
        }

        if(!id) {
            throw new Error("No ID specified");
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users"),
                store = transaction.objectStore("users"),
                req = store.get(id);

            req.onsuccess = () => {
                if(req.result) {
                    resolve(req.result);
                }
                else {
                    reject(new Error("Could not fetch specified user"));
                }
            };
            req.onerror = reject;
        });
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
     * @async
     * @returns {Array.<Object>} Array of all channels for
     *          the given type. May be empty.
     */
    getChannelsByType(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels"),
                store = transaction.objectStore("channels"),
                retchans = [];

            transaction.onerror = reject;

            if(!type) {
                store.index("typename").openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;

                    if(cursor) {
                        retchans.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(retchans);
                    }
                };
            }
            else {
                const keyRange = IDBKeyRange.only(type),
                    index = store.index("type");

                index.openCursor(keyRange).onsuccess = (event) => {
                    const cursor = event.target.result;

                    if(cursor) {
                        retchans.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(retchans);
                    }
                };
            }
        });
    }

    /**
     * Get all users in the ChannelList with a certain type.
     *
     * @param {string} [type] - The type all returned users should have. If left
     *                             out all users are returned.
     * @async
     * @returns {Array.<Object>} Array of users for the given
     *          type. May be empty.
     */
    getUsersByType(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users"),
                store = transaction.objectStore("users"),
                retusrs = [];

            transaction.onerror = reject;

            if(!type) {
                store.index("typename").openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;

                    if(cursor) {
                        retusrs.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(retusrs);
                    }
                };
            }
            else {
                const keyRange = IDBKeyRange.only(type),
                    index = store.index("type");

                index.openCursor(keyRange).onsuccess = (event) => {
                    const cursor = event.target.result;

                    if(cursor) {
                        retusrs.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        resolve(retusrs);
                    }
                };
            }
        });
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
        return users.filter((user) => {
            return user.favorites.indexOf(channel.login) !== -1;
        });
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
        return channels.filter((channel) => {
            return user.favorites.some((channame) => channame == channel.login);
        });
    }

    /**
     * Close the DB.
     *
     * @async
     * @returns {undefined} DB is being deleted, or may already be deleted.
     * @fires module:read-channel-list.ReadChannelList#close
     */
    close() {
        return new Promise((resolve) => {
            if(this.db) {
                this.db.close();
                this.db = null;
                resolve();
            }
            else {
                resolve();
            }
        });
    }
}
