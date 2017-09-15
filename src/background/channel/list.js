/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/list
 * @requires module:channel/core
 */
// setup event handling
import prefs from "../../preferences";
import { Channel } from "./core";
import LiveState from "../../live-state";
import ReadChannelList from './read-list';
import DatabaseManager, { FixListError } from '../../database-manager';

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
 * @event module:channel/list.ChannelList#error
 * @type {Error}
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
        DatabaseManager.registerErrorHandler(async (error) => {
            if(typeof error === "object" && error instanceof FixListError) {
                try {
                    await this.clear();
                }
                catch(e) {
                    console.error("Couldn't delete the DB");
                    DatabaseManager.emit("error", error);
                    throw e;
                }
            }
            throw error;
        });
        DatabaseManager.registerSuccessHanlder(async (db) => {
            // Set all channels to offline, that haven't been updated in a certain time.
            const cacheTime = await prefs.get("channellist_cacheTime"),
                transaction = db.transaction("channels", "readwrite"),
                store = transaction.objectStore("channels"),
                minDate = Date.now() - cacheTime, //now - 10 min
                req = store.index("typename").openCursor();
            await this._waitForCursor(req, (cursor) => {
                this.idCache.set(cursor.value.type + cursor.value.login, cursor.value.id);
                if(cursor.value.lastModified < minDate) {
                    cursor.value.live.state = LiveState.OFFLINE;
                    cursor.update(cursor.value);
                }
            });
        });

        super();
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
        await this._ready;
        channel.lastModified = Date.now();

        if(await this.channelExists(channel.login, channel.type)) {
            throw "Channel already exists";
        }

        const transaction = this.db.transaction("channels", "readwrite"),
            store = transaction.objectStore("channels"),
            req = store.add(channel.serialize());
        await this._waitForRequest(req);
        channel.id = req.result;
        this.idCache.set(channel.type + channel.login, channel.id);
        DatabaseManager.emit("channelsadded", [ channel ]);
        return channel;
    }

    /**
     * Add multiple channels to the list.
     *
     * @param {Array.<module:channel/core.Channel>} channels - The channels to add.
     * @fires module:channel/list.ChannelList#channelsadded
     * @returns {Array.<module:channel/core.Channel>} Added channels with their ID set.
     */
    async addChannels(channels) {
        if(channels instanceof Channel) {
            return this.addChannel(channels).then((channel) => [ channel ]);
        }
        else if(Array.isArray(channels)) {
            if(channels.length == 1) {
                return this.addChannel(channels[0]).then((channel) => [ channel ]);
            }
            else if(channels.length > 1) {
                await this._ready;
                const transaction = this.db.transaction("channels", "readwrite"),
                    store = transaction.objectStore("channels"),
                    index = store.index("typename"),
                    addedChannels = [];
                // Can't use promises here, because that closes the transaction.
                for(const channel of channels) {
                    const ireq = index.get([ channel.type, channel.login ]);
                    ireq.onsuccess = () => {
                        if(!ireq.result) {
                            channel.lastModified = Date.now();
                            const req = store.add(channel.serialize());
                            req.onerror = () => {
                                console.error(req.error);
                            };
                            req.onsuccess = () => {
                                channel.id = req.result;
                                this.idCache.set(channel.type + channel.login, req.result);
                                addedChannels.push(channel);
                            };
                        }
                        else {
                            console.warn("Channel " + channel.login + " has already been added");
                        }
                    };
                }
                return new Promise((resolve, reject) => {
                    transaction.oncomplete = () => {
                        if(addedChannels.length > 0) {
                            DatabaseManager.emit("channelsadded", addedChannels);
                        }
                        resolve(addedChannels);
                    };
                    transaction.onabort = () => reject(new Error('Transaction aborted'));
                });
            }
        }
        return [];
    }

    /**
     * Add a user to the list.
     *
     * @param {module:channel/core.User} user - The channel to add.
     * @fires module:channel/list.ChannelList#useradded
     * @returns {module:channel/core.User} The newly added User with ID.
     */
    async addUser(user) {
        await this._ready;
        if(await this.userExists(user.login, user.type)) {
            throw "User already exists";
        }

        const transaction = this.db.transaction("users", "readwrite"),
            store = transaction.objectStore("users"),
            req = store.add(user.serialize());
        await this._waitForRequest(req);
        user.id = req.result;
        DatabaseManager.emit("useradded", user);
        return user;
    }

    /**
     * Change the data of a channel.
     *
     * @param {module:channel/core.Channel} channel - The new data for the channel.
     * @fires module:channel/list.ChannelList#channelupdated
     * @returns {module:channel/core.Channel} The new version of the channel.
     */
    async setChannel(channel) {
        await this._ready;
        if(!("id" in channel)) {
            channel.id = await this.getChannelId(channel.login, channel.type);
        }
        const transaction = this.db.transaction("channels", "readwrite"),
            store = transaction.objectStore("channels");

        channel.lastModified = Date.now();

        const req = store.put(channel.serialize());
        await this._waitForRequest(req);
        this.idCache.set(channel.type + channel.login, req.result);
        channel.id = req.result; //TODO was there a reason to fetch the channel here?
        DatabaseManager.emit("channelupdated", channel);
        return channel;
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
        await this._ready;
        if(!("id" in user)) {
            user.id = await this.getUserId(user.login, user.type);
        }
        const transaction = this.db.transaction("users", "readwrite"),
            store = transaction.objectStore("users"),
            req = store.put(user.serialize());
        await this._waitForRequest(req);
        user.id = req.result;
        DatabaseManager.emit("userupdated", user);
        return user;
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
        await this._ready;
        if(type) {
            id = await this.getChannelId(id, type);
        }

        DatabaseManager.emit("beforechanneldeleted", id);
        const channel = await this.getChannel(id),
            transaction = this.db.transaction("channels", "readwrite"),
            store = transaction.objectStore("channels");
        await Promise.all([
            this.removeUsersWithFavorite(channel),
            this._waitForRequest(store.delete(id))
        ]);
        this.idCache.delete(channel.type + channel.login);
        DatabaseManager.emit("channeldeleted", channel);
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
        await this._ready;
        const user = await this.getUser(id, type),
            transaction = this.db.transaction("users", "readwrite"),
            store = transaction.objectStore("users"),
            req = store.delete(user.id);
        await this._waitForRequest(req);
        DatabaseManager.emit("userdeleted", user);
        return user;
    }

    /**
     * Remove all users that have the given channel as favorite.
     *
     * @param {module:channel/core.Channel} channel - Channel that users have favorited.
     * @fires module:channel/list.ChannelList#userdeleted
     * @returns {Array.<module:channel/core.User>} List of users that were removed.
     */
    async removeUsersWithFavorite(channel) {
        const users = await this.getUsersByFavorite(channel);
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
     * @returns {boolean} If true the DB was deleted.
     */
    async clear() {
        if(this.db !== null) {
            const transaction = this.db.transaction([ "channels", "users" ], "readwrite"),
                channels = transaction.objectStore("channels"),
                users = transaction.objectStore("users"),
                chanReq = channels.clear(),
                chanPromise = this._waitForRequest(chanReq),
                usrReq = users.clear(),
                usrPromise = this._waitForRequest(usrReq);
            await Promise.all([ chanPromise, usrPromise ]);
            DatabaseManager.emit("clear", false);
            return false;
        }
        /*
         * This is the slower path, so we avoid it. It needs all transactions
         * to be done in order to slowly erase the whole DB from the disk, just
         * to reinitialize it afterward.
         */
        await DatabaseManager.delete();
        await DatabaseManager.open(this.name, true);
        return true;
    }
}
