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
import { Channel } from "./core";
import LiveState from "../../live-state";
import ReadChannelList from './read-list';
import { FixListError } from './read-list';

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
 * @class module:channel/list.ChannelList
 * @extends external:EventTarget
 */
export default class ChannelList extends ReadChannelList {
    /**
     * @constructs
     * @fires module:channel/list.ReadChannelList#ready
     */
    constructor() {
        super();
    }

    /**
     * Opens the DB, initializes the schema if it's a new DB or sets channels
     * offline that were online and have last been updated a certain time ago.
     *
     * @param {string} name - Name of the DB to open.
     * @param {boolean} [dontTry=false] - Don't try to fix the DB.
     * @async
     * @fires module:channel/list.ChannelList#ready
     * @returns {undefined} The DB is ready.
     * @throws Could not open the DB.
     */
    openDB(name, dontTry = false) {
        return super.openDB(name, dontTry).then(() => {
            return prefs.get("channellist_cacheTime");
        }).then((cacheTime) => {
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
                    emit(this, "ready");
                }
            };
        }).catch((error) => {
            if(typeof error === "object" && error instanceof FixListError) {
                return this.clear().catch((e) => {
                    console.error("Couldn't delete the DB");
                    emit(this, "unfixableerror");
                    throw e;
                });
            }
            throw error;
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
                                console.warn("Channel " + channel.login + " has already been added");
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
     * Remove all users that have the given channel as favorite.
     *
     * @param {number} channelId - ID of the channel that users have favorited.
     * @fires module:channel/list.ChannelList#userdeleted
     * @returns {Array.<module:channel/core.User>} List of users that were removed.
     */
    async removeUsersWithFavorite(channelId) {
        const channel = await this.getChannel(channelId),
            users = await this.getUsersByFavorite(channel);
        return Promise.all(users.map((user) => {
            return this.removeUser(user.id);
        }));
    }

    /**
     * Remove all channels that are favorited by a user.
     *
     * @param {number} userId - ID of the user whose favorites should be removed.
     * @fires module:channel/list.ChannelList#channeldeleted
     * @fires module:channel/list.ChannelList#beforechanneldeleted
     * @returns {Array.<module:channel/core.Channel>} List of removed channels.
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
        const done = (hard = false) => {
            emit(this, "clear", hard);
            return Promise.resolve(hard);
        };

        if(this.db) {
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
            /*
             * This is the slower path, so we avoid it. It needs all transactions
             * to be done in order to slowly erase the whole DB from the disk, just
             * to reinitialize it afterward.
             */
            const promise = new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase(ReadChannelList.name);

                request.onerror = reject;
                request.onsuccess = () => resolve();
                /* istanbul ignore next */
                request.onblocked = () => console.warn("Deleting database was blocked");
            });

            // Reopen the DB after it's been cleared. Don't try to fix it, if it
            // doesn't want to open.
            return promise
                .then(() => done(true))
                .then(() => this.openDB(ReadChannelList.name, true))
                .then(() => true);
        }
    }
}
