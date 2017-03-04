/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/list
 * @requires module:channel/core
 */
// setup event handling
import { emit } from "../../utils";
import prefs from "../preferences";
import { Channel, User } from "./core";
import LiveState from "../../live-state";
import EventTarget from 'event-target-shim';

/**
 * IndexedDB version.
 *
 * @const {number}
 * @default 2
 */
const VERSION = 2,

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
 * @event module:channel/list.ChannelList#ready
 */
/**
 * Whenever one or more channels are added to the ChannelList this event is
 * fired.
 *
 * @event module:channel/list.ChannelList#channelsadded
 * @type {Array.<module:channel/core.Channel>}
 */
/**
 * Whenever a user is added to the ChannelList this event is fired.
 *
 * @event module:channel/list.ChannelList#useradded
 * @type {module:channel/core.User}
 */
/**
 * @event module:channel/list.ChannelList#channelupdated
 * @type {module:channel/core.Channel}
 */
/**
 * @event module:channel/list.ChannelList#userupdated
 * @type {module:channel/core.User}
 */
/**
 * Gets fired before a channel is deleted.
 *
 * @event module:channel/list.ChannelList#beforechanneldeleted
 * @type {number}
 */
/**
 * Gets fired after a channel was deleted.
 *
 * @event module:channel/list.ChannelList#channeldeleted
 * @type {module:channel/core.Channel}
 */
/**
 * @event module:channel/list.ChannelList#userdeleted
 * @type {module:channel/core.User}
 */
/**
 * Fired when all content of the ChannelList is removed. If the first argument
 * is true, the whole DB has been deleted and recreated, most likely to fix it.
 *
 * @event module:channel/list.ChannelList#clear
 * @type {boolean}
 */
/**
 * The database could not be repaired.
 *
 * @event module:channel/list.ChannelList#unfixableerror
 */
/**
 * The datbase was fixed, but all the content was list in the process. User
 * might want to re-add content.
 *
 * @event module:channel/list.ChannelList#fixdb
 */

/**
 * @class module:channel/list.ChannelList
 * @extends external:EventTarget
 */
export default class ChannelList extends EventTarget {
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
     * @fires module:channel/list.ChannelList#ready
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
     * @param {string} name - Name of the DB to open.
     * @param {boolean} [dontTry=false] - Don't try to fix the DB.
     * @async
     * @fires module:channel/list.ChannelList#ready
     * @fires module:channel/list.ChannelList#fixdb
     * @returns {undefined} The DB is ready.
     * @throws Could not open the DB.
     */
    openDB(name, dontTry = false) {
        console.log(`ChannelList.openDB(${name},${dontTry})`);
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

                const users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
                users.createIndex("typename", [ "type", "login" ], { unique: true });
                users.createIndex("type", "type", { unique: false });
                //users.createIndex("id", "id", { unique: true });
                const channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
                channels.createIndex("typename", [ "type", "login" ], { unique: true });
                channels.createIndex("type", "type", { unique: false });
                //channels.createIndex("id", "id", { unique: true });
            };

            // DB is ready
            request.onsuccess = (e) => {
                this.db = e.target.result;

                prefs.get("channellist_cacheTime").then((cacheTime) => {
                    // Set all channels to offline, that haven't been updated in a certain time.
                    const transaction = this.db.transaction("channels", "readwrite"),
                        store = transaction.objectStore("channels"),
                        minDate = Date.now() - cacheTime, //now - 10 min
                        req = store.index("typename").openCursor();

                    req.onsuccess = (event) => {
                        const cursor = event.target.result;

                        if(cursor) {
                            this.idCache.set(cursor.value.type + cursor.value.login, cursor.value.id);
                            if(cursor.value.lastModified < minDate) {
                                cursor.value.live.state = LiveState.OFFLINE;
                                cursor.update(cursor.value);
                            }
                            cursor.continue();
                        }
                        else {
                            resolve();
                            emit(this, "ready");
                        }
                    };
                });
            };

            /* istanbul ignore next */
            request.onerror = () => {
                if(!dontTry) {
                    if(this.db) {
                        this.db.close();
                        delete this.db;
                    }
                    resolve(this.clear().catch((e) => {
                        console.error("Couldn't delete the DB");
                        emit(this, "unfixableerror");
                        throw e;
                    }));
                }
                else {
                    console.error(request.error);
                    reject();
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
        console.info("ChannelList.getChannelId(" + name + "," + type + ")");
        return new Promise((resolve, reject) => {
            if(this.idCache.has(type + name)) {
                console.warn("HIT ID CACHE");
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
                        reject();
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
                    reject();
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
     * @returns {module:channel/core.Channel}
     * @throws The channel doesn't exist or no arguments passed.
     */
    async getChannel(id, type) {
        console.info("ChannelList.getChannel(" + id + ")");
        if(type) {
            id = await this.getChannelId(id, type);
        }
        if(!id) {
            throw "No ID specified";
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels"),
                store = transaction.objectStore("channels"),
                req = store.get(id);

            req.onsuccess = () => {
                if(req.result) {
                    resolve(Channel.deserialize(req.result));
                }
                else {
                    reject();
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
     * @returns {module:channel/core.User}
     * @throws The user doesn't exist or no arguments passed.
     */
    async getUser(id, type) {
        if(type) {
            id = await this.getUserId(id, type);
        }

        if(!id) {
            throw "No ID specified";
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users"),
                store = transaction.objectStore("users"),
                req = store.get(id);

            req.onsuccess = () => {
                if(req.result) {
                    resolve(User.deserialize(req.result));
                }
                else {
                    reject();
                }
            };
            req.onerror = reject;
        });
    }

    /**
     * Add a channel to the list.
     *
     * @param {module:channel/core.Channel} channel - The channel to add.
     * @throws {string} If the channel is already in the list.
     * @fires module:channel/list.ChannelList#channelsadded
     * @returns {module:channel/core.Channel} Added channel with the ID set.
     */
    async addChannel(channel) {
        console.info("ChannelList.addChannel(" + channel.login + ")");
        channel.lastModified = Date.now();

        if(await this.channelExists(channel.login, channel.type)) {
            throw "Channel already exists";
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels", "readwrite"),
                store = transaction.objectStore("channels"),
                req = store.add(channel.serialize());

            req.onsuccess = () => {
                channel.id = req.result;
                this.idCache.set(channel.type + channel.login, channel.id);
                emit(this, "channelsadded", [ channel ]);
                resolve(channel);
            };
            req.onerror = reject;
        });
    }

    /**
     * Add multiple channels to the list.
     *
     * @param {Array.<module:channel/core.Channel>} channels - The channels to add.
     * @fires module:channel/list.ChannelList#channelsadded
     * @async
     * @returns {Array.<module:channel/core.Channel>} Added channels with their ID set.
     */
    addChannels(channels) {
        console.info("ChannelList.addChannels(channels)");
        if(channels instanceof Channel) {
            return this.addChannel(channels).then((channel) => [ channel ]);
        }
        else if(Array.isArray(channels)) {
            if(channels.length == 1) {
                return this.addChannel(channels[0]).then((channel) => [ channel ]);
            }
            else if(channels.length > 1) {
                return new Promise((resolve) => {
                    const transaction = this.db.transaction("channels", "readwrite"),
                        store = transaction.objectStore("channels"),
                        index = store.index("typename"),
                        addedChannels = [];
                    channels.forEach((channel, i) => {
                        const ireq = index.get([ channel.type, channel.login ]);
                        ireq.onsuccess = () => {
                            if(!ireq.result) {
                                console.log("Adding channel " + channel.login);
                                channel.lastModified = Date.now();
                                const req = store.add(channel.serialize());
                                req.onsuccess = () => {
                                    channels[i].id = req.result;
                                    this.idCache.set(channel.type + channel.login, req.result);
                                    addedChannels.push(channels[i]);
                                };
                                /* istanbul ignore next */
                                req.onerror = () => {
                                    console.error(req.error);
                                };
                            }
                            else {
                                console.log("Channel " + channel.login + " has already been added");
                            }
                        };
                    }, this);
                    transaction.oncomplete = () => {
                        if(addedChannels.length > 0) {
                            emit(this, "channelsadded", addedChannels);
                        }
                        resolve(addedChannels);
                    };
                });
            }
        }
        return Promise.resolve([]);
    }

    /**
     * Add a user to the list.
     *
     * @param {module:channel/core.User} user - The channel to add.
     * @fires module:channel/list.ChannelList#useradded
     * @returns {module:channel/core.User} The newly added User with ID.
     */
    async addUser(user) {
        if(await this.userExists(user.login, user.type)) {
            throw "User already exists";
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users", "readwrite"),
                store = transaction.objectStore("users"),
                req = store.add(user.serialize());

            req.onsuccess = () => {
                user.id = req.result;
                resolve(user);
                emit(this, "useradded", user);
            };
            req.onerror = reject;
        });
    }

    /**
     * Change the data of a channel.
     *
     * @param {module:channel/core.Channel} channel - The new data for the channel.
     * @fires module:channel/list.ChannelList#channelupdated
     * @returns {module:channel/core.Channel} The new version of the channel.
     */
    async setChannel(channel) {
        console.info("ChannelList.setChannel(" + channel.id + ")");
        if(!("id" in channel)) {
            channel.id = await this.getChannelId(channel.login, channel.type);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels", "readwrite"),
                store = transaction.objectStore("channels");

            channel.lastModified = Date.now();

            const req = store.put(channel.serialize());

            req.onsuccess = () => {
                this.idCache.set(channel.type + channel.login, req.result);
                channel.id = req.result; //TODO was there a reason to fetch the channel here?
                resolve(channel);
                emit(this, "channelupdated", channel);
            };
            req.onerror = reject;
        });
    }

    /**
     * Change the data of a user.
     *
     * @param {module:channel/core.User} user - The new data for the user.
     * @fires module:channel/list.ChannelList#userupdated
     * @returns {module:channel/core.User} The new version of the user stored
     *                                      in the ChannelList.
     */
    async setUser(user) {
        if(!("id" in user)) {
            user.id = await this.getUserId(user.login, user.type);
        }
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users", "readwrite"),
                store = transaction.objectStore("users"),
                req = store.put(user.serialize());

            req.onsuccess = () => {
                user.id = req.result;
                emit(this, "userupdated", user);
                resolve(user);
            };
            req.onerror = reject;
        });
    }

    /**
     * Remove a channel from the list. Also removes all users that have this channel
     * as favorite.
     *
     * @param {(number|string)} id - ID or login of the channel to remove.
     * @param {string} [type] - Type of the channel if no ID was passed.
     * @fires module:channel/list.ChannelList#beforechanneldeleted
     * @fires module:channel/list.ChannelList#channeldeleted
     * @returns {module:channel/core.Channel} Resolves to the removed channel.
     */
    async removeChannel(id, type) {
        console.info("ChannelList.removeChannel(" + id + ")");
        if(type) {
            id = await this.getChannelId(id, type);
        }

        emit(this, "beforechanneldeleted", id);
        const channel = await this.getChannel(id);
        await Promise.all([
            this.removeUsersWithFavorite(id),
            new Promise((resolve, reject) => {
                const transaction = this.db.transaction("channels", "readwrite"),
                    store = transaction.objectStore("channels"),
                    req = store.delete(id);
                console.log("queued deletion");

                req.onsuccess = () => {
                    this.idCache.delete(channel.type + channel.login);
                    resolve(channel);
                    emit(this, "channeldeleted", channel);
                };
                req.onerror = reject;
            })
        ]);

        return channel;
    }

    /**
     * Remove a user from the list.
     *
     * @param {(number|string)} id - ID or login of the user to remove.
     * @param {string} [type] - Type of the user if no ID was passed.
     * @fires module:channel/list.ChannelList#userdeleted
     * @returns {module:channel/core.User} Resolves to the removed user.
     */
    async removeUser(id, type) {
        const user = await this.getUser(id, type);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users", "readwrite"),
                store = transaction.objectStore("users"),
                req = store.delete(user.id);

            req.onsuccess = () => {
                resolve(user);
                emit(this, "userdeleted", user);
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
        console.info("ChannelList.channelExists(", id, ",", type, ")");
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
        console.info("ChannelList.userExists(", id, ",", type, ")");

        return this.getUser(id, type).then((channel) => !!channel, () => false);
    }

    /**
     * Get the live status of the ChannelList as a whole.
     *
     * @param {string} [type] - Check the live state of just the channels of the
     *                             specified type.
     * @todo make live an index and then get all the channels that are live and
     *       count those. That should be slightly faster than this O(n)
     *       operation on the array of all channels.
     * @returns {boolean} Resolves to a boolean indicating, if there are any live
     *                   channels.
     */
    async liveStatus(type) {
        const channels = await this.getChannelsByType(type);
        return channels.some((channel) => channel.live.isLive());
    }

    /**
     * Get all channels with the specified type.
     *
     * @param {string} [type] - Type all the channels should have. If left out,
     *                             all channels are returned.
     * @async
     * @returns {Array.<module:channel/core.Channel>}
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
                        retchans.push(Channel.deserialize(cursor.value));
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
                        retchans.push(Channel.deserialize(cursor.value));
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
     * @returns {Array.<module:channel/core.User>}
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
                        retusrs.push(User.deserialize(cursor.value));
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
                        retusrs.push(User.deserialize(cursor.value));
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
     * @returns {Array.<module:channel/core.User>}
     */
    async getUsersByFavorite(channel) {
        const users = await this.getUsersByType(channel.type);
        return users.filter((user) => {
            console.log("Scanning user " + user.login + " with the favorites " + user.favorites);
            return user.favorites.indexOf(channel.login) !== -1;
        });
    }

    /**
     * Remove all users that have the given channel as favorite.
     *
     * @param {number} channelId - ID of the channel that users have favorited.
     * @fires module:channel/list.ChannelList#userdeleted
     * @returns {Array.<module:channel/core.User>}
     */
    async removeUsersWithFavorite(channelId) {
        const channel = await this.getChannel(channelId);
        const users = await this.getUsersByFavorite(channel);
        return Promise.all(users.map((user) => {
            console.log("Removing user " + user.login + " because he follows " + channel.login);
            return this.removeUser(user.id);
        }));
    }

    /**
     * Get all channels that are favorited by a user.
     *
     * @param {module:channel/core.User} user - User to get the favorites of.
     * @returns {Array.<module:channel/core.Channel>}
     */
    async getChannelsByUserFavorites(user) {
        const channels = await this.getChannelsByType(user.type);
        return channels.filter((channel) => {
            return user.favorites.some((channame) => channame == channel.login);
        });
    }

    /**
     * Remove all channels that are favorited by a user.
     *
     * @param {number} userId - ID of the user whose favorites should be removed.
     * @fires module:channel/list.ChannelList#channeldeleted
     * @fires module:channel/list.ChannelList#beforechanneldeleted
     * @returns {Array.<module:channel/core.Channel>}
     */
    async removeChannelsByUserFavorites(userId) {
        const user = await this.getUser(userId),
            channels = await this.getChannelsByUserFavorites(user);
        return Promise.all(channels.map((channel) => {
            return this.removeChannel(channel.id);
        }));
    }

    /**
     * Clear all contents of the ChannelList. Sometimes reinitializes the DB from
     * scratch.
     *
     * @fires module:channel/list.ChannelList#clear
     * @fires module:channel/list.ChannelList#ready
     * @async
     * @returns {boolean} If true the DB was deleted.
     */
    clear() {
        console.info("ChannelList.clear");

        const done = (hard = false) => {
            emit(this, "clear", hard);
            return Promise.resolve(hard);
        };

        if(this.db) {
            console.info("Clearing object stores");
            const transaction = this.db.transaction([ "channels", "users" ], "readwrite"),
                channels = transaction.objectStore("channels"),
                users = transaction.objectStore("users"),
                chanPromise = new Promise((resolve, reject) => {
                    const chanReq = channels.clear();
                    chanReq.onerror = reject;
                    chanReq.onsuccess = resolve;
                }),
                usrPromise = new Promise((resolve, reject) => {
                    const usrReq = users.clear();
                    usrReq.onerror = reject;
                    usrReq.onsuccess = resolve;
                });
            return Promise.all([ chanPromise, usrPromise ]).then(() => done(false));
        }
        else {
            console.log("Deleting and reinitializing the DB");
            /*
             * This is the slower path, so we avoid it. It needs all transactions
             * to be done in order to slowly erase the whole DB from the disk, just
             * to reinitialize it afterward.
             */
            const promise = new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase(NAME);

                request.onerror = reject;
                request.onsuccess = () => resolve();
                /* istanbul ignore next */
                request.onblocked = () => console.log("Deleting database was blocked");
            });

            // Reopen the DB after it's been cleared. Don't try to fix it, if it
            // doesn't want to open.
            return promise
                .then(() => done(true))
                .then(() => this.openDB(NAME, true))
                .then(() => true);
        }
    }

    /**
     * Close the DB.
     *
     * @async
     * @returns {undefined} DB is being deleted, or may already be deleted.
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
