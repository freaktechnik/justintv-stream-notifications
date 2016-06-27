/**
 * Channel list Object
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/list
 * @requires module:channel/core
 */

"use strict";

/**
 * IndexedDB version
 * @const {number}
 * @default 2
 */
const VERSION = 2;

/**
 * Database name
 * @const {string}
 * @default "channellist"
 */
const NAME = "channellist";

// setup event handling
const { emit } = require("sdk/event/core"),
      { EventTarget } = require("sdk/event/target");

const { indexedDB, IDBKeyRange } = require("sdk/indexed-db"),
      { prefs } = require("sdk/simple-prefs");

const { Channel, User } = require("./core");
const { LiveState } = require("./live-state");

const providers = require("../providers");

/**
 * The ChannelList is ready to be used.
 * @event module:channel/list.ChannelList#ready
 */
/**
 * Whenever one or more channels are added to the ChannelList this event is
 * fired.
 * @event module:channel/list.ChannelList#channelsadded
 * @type {Array.<module:channel/core.Channel>}
 */
/**
 * Whenever a user is added to the ChannelList this event is fired.
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
 * @event module:channel/list.ChannelList#beforechanneldeleted
 * @type {number}
 */
/**
 * Gets fired after a channel was deleted.
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
 * @event module:channel/list.ChannelList#clear
 * @type {boolean}
 */
/**
 * The database could not be repaired.
 * @event module:channel/list.ChannelList#unfixableerror
 */
/**
 * The datbase was fixed, but all the content was list in the process. User
 * might want to re-add content.
 * @event module:channel/list.ChannelList#fixdb
 */

/**
 * @class module:channel/list.ChannelList
 */
class ChannelList extends EventTarget {
    /**
     * @constructs
     * @argument {Object} options - Event listener object
     * @extends external:sdk/event/target.EventTarget
     * @fires module:channel/list.ChannelList#ready
     */
    constructor(options) {
        super.initialize(options);
        /**
         * Reference to the DB
         * @type {IndexedDB?}
         */
        this.db = null;
        /**
         * Holds a promise until the DB is being opened.
         * @type {Promise?}
         */
        this._openingDB = null;

        this.openDB(NAME);
    }

    /**
     * Opens the DB, initializes the schema if it's a new DB or sets channels
     * offline that were online and have last been updated a certain time ago.
     * @argument {string} name - Name of the DB to open.
     * @argument {boolean} [dontTry=false] - Don't try to fix the DB.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#ready
     * @fires module:channel/list.ChannelList#fixdb
     * @resolves The DB is ready
     */
    openDB(name, dontTry = false) {
        console.log(`ChannelList.openDB(${name},${dontTry})`);
        // Quick path if DB is already opened.
        if(this.db !== null)
            return Promise.resolve();
        else if(this._openingDB !== null)
            return this._openingDB;

        this._openingDB = new Promise((resolve, reject) => {
            // Try to open the DB
            const request = indexedDB.open(name, VERSION);

            // Set up DB
            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                if(e.oldVersion == 1) {
                    const channels = e.target.transaction.objectStore("channels");
                    const request = channels.openCursor();

                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if(cursor) {
                            const channel = cursor.value;
                            channel.live = (new LiveState()).serialize();
                            //TODO fix old-style chans too, instead of doing that on-demand
                            channels.put(channel);
                        }
                    };
                }
                else {
                    const users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
                    users.createIndex("typename", ["type","login"], { unique: true });
                    users.createIndex("type", "type", { unique: false });
                    //users.createIndex("id", "id", { unique: true });
                    const channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
                    channels.createIndex("typename", ["type","login"], { unique: true });
                    channels.createIndex("type", "type", { unique: false });
                    //channels.createIndex("id", "id", { unique: true });
                }
            };

            // DB is ready
            request.onsuccess = (e) => {
                this.db = e.target.result;

                // Set all channels to offline, that haven't been updated in a certain time.
                const transaction = this.db.transaction("channels", "readwrite"),
                      store = transaction.objectStore("channels"),
                      retchans = [],
                      minDate = Date.now() - prefs.channellist_cacheTime, //now - 10 min
                      req = store.index("typename").openCursor();

                req.onsuccess = (event) => {
                    var cursor = event.target.result;

                    if(cursor) {
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
            };

            /* istanbul ignore next */
            request.onerror = () => {
                if(!dontTry) {
                    if(this.db !== null) {
                        this.db.close();
                        delete this.db;
                    }
                    resolve(this.clear().catch(() => {
                        console.error("Couldn't delete the DB");
                        emit(this, "unfixableerror");
                    }));
                }
                else {
                    console.error(request.error);
                    reject();
                }
            };
        });
        // Clear it once the promise is done.
        this._openingDB.then(() => this._openingDB = null, () => this._openingDB = null);
        return this._openingDB;
    }

    /**
     * Gets the ID of a channel, if it is in the ChannelList
     * @argument {string} name - Login of the channel.
     * @argument {string} type - Type of the channel.
     * @return {Promise}
     * @resolves {number} The ID of the channel if it exists.
     */
    getChannelId(name, type) {
        console.info("ChannelList.getChannelId("+name+","+type+")");
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels"),
                  index = transaction.objectStore("channels").index("typename"),
                  req = index.get([type, name]);
            req.onsuccess = function(event) {
                if(req.result)
                    resolve(req.result.id);
                else
                    reject();
            };
            req.onerror = reject;
        });
    }

    /**
     * Gets the ID of a user, if it is in the ChannelList.
     * @argument {string} name - Login of the user.
     * @argument {string} type - Type of the user.
     * @return {Promise}
     * @resolves {number} The ID of the user (if it exsits).
     */
    getUserId(name, type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("users"),
                  index = transaction.objectStore("users").index("typename"),
                  req = index.get([type, name]);
            req.onsuccess = function(event) {
                if(req.result)
                    resolve(req.result.id);
                else
                    reject();
            };
            req.onerror = reject;
        });
    }

    /**
     * Get the specified channel.
     * @argument {(number|string)} id - ID of login of the channel.
     * @argument {string} [type] - Type of the channel if a login was passed as
     *                             first argument.
     * @return {Promise}
     * @resolves {module:channel/core.Channel}
     * @rejects The channel doesn't exist or no arguments passed.
     */
    async getChannel(id, type) {
        console.info("ChannelList.getChannel("+id+")");
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
                    // Fix messed up channels from 3.2.1
                    if("favorites" in req.result) {
                        resolve(providers[req.result.type].getChannelDetails(req.result.login).then((chan) => {
                            return this.setChannel(chan);
                        }));
                    }
                    else {
                        resolve(Channel.deserialize(req.result));
                    }
                }
                else
                    reject();
            };
            req.onerror = reject;
        });
    }

    /**
     * Get the specified user.
     * @argument {(number|string)} id - ID of login of the user.
     * @argument {string} [type] - Type of the user if a login was passed as first
     *                             argument.
     * @return {Promise}
     * @resolves {module:channel/core.User}
     * @rejects The user doesn't exist or no arguments passed.
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
                if(req.result)
                    resolve(User.deserialize(req.result));
                else
                    reject();
            };
            req.onerror = reject;
        });
    }

    /**
     * Add a channel to the list.
     * @argument {module:channel/core.Channel} channel - The channel to add
     * @return {Promise}
     * @rejects {string} If the channel is already in the list.
     * @fires module:channel/list.ChannelList#channelsadded
     * @resolves {module:channel/core.Channel} Added channel with the ID set.
     */
    async addChannel(channel) {
        console.info("ChannelList.addChannel("+channel.login+")");
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
                emit(this, "channelsadded", [channel]);
                resolve(channel);
            };
            req.onerror = reject;
        });
    }

    /**
     * Add multiple channels to the list.
     * @argument {Array.<module:channel/core.Channel>} channels - The channels to add
     * @return {Promise}
     * @fires module:channel/list.ChannelList#channelsadded
     * @resolves {Array.<module:channel/core.Channel>} Added channels with their ID set.
     */
    addChannels(channels) {
        console.info("ChannelList.addChannels(channels)");
        if(channels instanceof Channel) {
            return this.addChannel(channels).then((channel) => [channel]);
        }
        else if(Array.isArray(channels)) {
            if(channels.length == 1) {
                return this.addChannel(channels[0]).then((channel) => [channel]);
            }
            else if(channels.length > 1) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction("channels", "readwrite"),
                          store = transaction.objectStore("channels"),
                          index = store.index("typename"),
                          addedChannels = [];
                    channels.forEach(function(channel, i) {
                        var ireq = index.get([channel.type, channel.login]);
                        ireq.onsuccess = function(event) {
                            if(!ireq.result) {
                                console.log("Adding channel "+channel.login);
                                channel.lastModified = Date.now();
                                var req = store.add(channel.serialize());
                                req.onsuccess = function() {
                                    channels[i].id = req.result;
                                    addedChannels.push(channels[i]);
                                };
                                /* istanbul ignore next */
                                req.onerror = () => { console.error(req.error); };
                            }
                            else {
                                console.log("Channel "+channel.login+" has already been added");
                            }
                        };
                    }, this);
                    transaction.oncomplete = (e) => {
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
     * @argument {module:channel/core.User} channel - The channel to add
     * @return {Promise}
     * @fires module:channel/list.ChannelList#useradded
     * @resolves {module:channel/core.User} The newly added User with ID.
     */
    async addUser(user) {
        if(await this.userExists(user.login, user.type))
            throw "User already exists";

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
    });

    /**
     * Change the data of a channel
     * @argument {module:channel/core.Channel} channel - The new data for the channel
     * @return {Promise}
     * @fires module:channel/list.ChannelList#channelupdated
     * @resolves {module:channel/core.Channel} The new version of the channel.
     */
    async setChannel(channel) {
        console.info("ChannelList.setChannel("+channel.id+")");
        if(!("id" in channel)) {
            channel.id = await this.getChannelId(channel.login, channel.type);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels", "readwrite"),
                  store = transaction.objectStore("channels");

            channel.lastModified = Date.now();

            const req = store.put(channel.serialize());

            req.onsuccess = () => {
                this.getChannel(req.result).then((chan) => {
                    resolve(chan);
                    emit(this, "channelupdated", chan);
                });
            };
            req.onerror = reject;
        });
    }

    /**
     * Change the data of a user
     * @argument {module:channel/core.User} user - The new data for the user.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#userupdated
     * @resolves {module:channel/core.User} The new version of the user stored
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
                this.getUser(req.result).then((usr) => {
                    resolve(usr);
                    emit(this, "userupdated", usr);
                });
            };
            req.onerror = reject;
        });
    }

    /**
     * Remove a channel from the list. Also removes all users that have this channel
     * as favorite.
     * @argument {(number|string)} id - ID or login of the channel to remove.
     * @argument {string} [type] - Type of the channel if no ID was passed.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#beforechanneldeleted
     * @fires module:channel/list.ChannelList#channeldeleted
     * @resolves {module:channel/core.Channel} Resolves to the removed channel.
     */
    async removeChannel(id, type) {
        console.info("ChannelList.removeChannel("+id+")");
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
     * @argument {(number|string)} id - ID or login of the user to remove.
     * @argument {string} [type] - Type of the user if no ID was passed.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#userdeleted
     * @resolves {module:channel/core.User} Resolves to the removed user.
     */
    async removeUser(id, type) {
        let user = await this.getUser(id, type);
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
     * @argument {(number|string)} id - ID or login of the channel.
     * @argument {string} [type] - Type of the channel if no ID was passed.
     * @return {Promise}
     * @resolves{boolean} Resolves to a boolean indicating if the channel exists
     */
    channelExists(id, type) {
        console.info("ChannelList.channelExists(",id,",",type,")");
        return this.getChannel(id, type).then((channel) => !!channel, () => false);
    }

    /**
     * Check if a user is in the ChannelList.
     * @argument {(number|string)} id - ID or login of the user.
     * @argument {string} [type] - Type of the user if no ID was passed.
     * @return {Promise}
     * @resolves {boolean} Resolves to a boolean indicating if the user exists.
     */
    userExists(id, type) {
        console.info("ChannelList.userExists(",id,",",type,")");

        return this.getUser(id, type).then((channel) => !!channel, () => false);
    }

    /**
     * Get the live status of the ChannelList as a whole.
     * @argument {string} [type] - Check the live state of just the channels of the
     *                             specified type.
     * @return {Promise.<boolean>} Resolves to a boolean indicating, if there are
     *                             any live channels.
     * @todo make live an index and then get all the channels that are live and
     *       count those. That should be slightly faster than this O(n)
     *       operation on the array of all channels.
     * @resolves {boolean}
     */
    async liveStatus(type) {
        let channels = await this.getChannelsByType(type);
        return channels.some((channel) => channel.live.isLive());
    }

    /**
     * Get all channels with the specified type
     * @argument {string} [type] - Type all the channels should have. If left out,
     *                             all channels are returned.
     * @return {Promise}
     * @resolves {Array.<module:channel/core.Channel>}
     */
    getChannelsByType(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction("channels"),
                  store = transaction.objectStore("channels"),
                  retchans = [];

            transaction.onerror = reject;

            var needsCleanup = false;

            if(!type) {
                var req = store.index("typename").openCursor().onsuccess = (event) => {
                    var cursor = event.target.result;

                    if(cursor) {
                        if(!needsCleanup && "favorites" in cursor.value)
                            needsCleanup = true;
                        retchans.push(Channel.deserialize(cursor.value));
                        cursor.continue();
                    }
                    else {
                        if(needsCleanup) {
                            resolve(Promise.all(retchans.map((chan) => {
                                if(chan.url.length === 0) {
                                    return providers[chan.type].getChannelDetails(chan.login).then((channel) => {
                                        return this.setChannel(channel);
                                    }, (e) => chan);
                                }
                                else {
                                    return Promise.resolve(chan);
                                }
                            })));
                        }
                        else {
                            resolve(retchans);
                        }
                    }
                };
            }
            else {
                const keyRange = IDBKeyRange.only(type),
                      index = store.index("type");

                index.openCursor(keyRange).onsuccess = (event) => {
                    const cursor = event.target.result;

                    if(cursor) {
                        if(!needsCleanup && "favorites" in cursor.value)
                            needsCleanup = true;
                        retchans.push(Channel.deserialize(cursor.value));
                        cursor.continue();
                    }
                    else {
                        if(needsCleanup) {
                            resolve(Promise.all(retchans.map((chan) => {
                                if(chan.url.length === 0) {
                                    return providers[chan.type].getChannelDetails(chan.login).then((channel) => {
                                        return this.setChannel(channel);
                                    }, (e) => chan);
                                }
                                else {
                                    return Promise.resolve(chan);
                                }
                            })));
                        }
                        else {
                            resolve(retchans);
                        }
                    }
                };
            }
        });
    }

    /**
     * Get all users in the ChannelList with a certain type.
     * @argument {string} [type] - The type all returned users should have. If left
     *                             out all users are returned.
     * @return {Promise}
     * @resolves {Array.<module:channel/core.User>}
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
     * @argument {module:channel/core.Channel} channel - Channel to search users's
     *                                                  favorites for.
     * @return {Promise}
     * @resolves {Array.<module:channel/core.User>}
     */
    async getUsersByFavorite(channel) {
        let users = await this.getUsersByType(channel.type);
        return users.filter((user) => {
            console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
            return user.favorites.indexOf(channel.login) !== -1;
        });
    }

    /**
     * Remove all users that have the given channel as favorite.
     * @argument {number} channelId - ID of the channel that users have favorited.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#userdeleted
     * @resolves {Array.<module:channel/core.User>}
     */
    async removeUsersWithFavorite(channelId) {
        let channel = await this.getChannel(channelId);
        let users = await this.getUsersByFavorite(channel);
        return Promise.all(users.map((user) => {
            console.log("Removing user "+user.login+" because he follows "+channel.login);
            return this.removeUser(user.id);
        }));
    }

    /**
     * Get all channels that are favorited by a user.
     * @argument {module:channel/core.User} user - User to get the favorites of.
     * @return {Promise}
     * @resolves {Array.<module:channel/core.Channel>}
     */
    async getChannelsByUserFavorites(user) {
        let channels = await this.getChannelsByType(user.type);
        return channels.filter((channel) => {
            return user.favorites.some((channame) => channame == channel.login);
        });
    }

    /**
     * Remove all channels that are favorited by a user.
     * @argument {number} userId - ID of the user whose favorites should be removed.
     * @return {Promise}
     * @fires module:channel/list.ChannelList#channeldeleted
     * @fires module:channel/list.ChannelList#beforechanneldeleted
     * @resolves {Array.<module:channel/core.Channel>}
     */
    async removeChannelsByUserFavorites(userId) {
        let user = await this.getUser(userId);
        let channels = await this.getChannelsByUserFavorites(user);
        return Promise.all(channels.map((channel) => {
            return this.removeChannel(channel.id);
        }));
    }

    /**
     * Clear all contents of the ChannelList. Sometimes reinitializes the DB from
     * scratch.
     * @fires module:channel/list.ChannelList#clear
     * @fires module:channel/list.ChannelList#ready
     * @return {Promise}
     * @resolves {boolean} If true the DB was deleted.
     */
    clear() {
        console.info("ChannelList.clear");

        const done = (hard = false) => {
            emit(this, "clear", hard);
            return Promise.resolve(hard);
        };

        if(this.db !== null) {
            console.info("Clearing object stores");
            const transaction = this.db.transaction(["channels", "users"], "readwrite");
            const channels = transaction.objectStore("channels");
            const users = transaction.objectStore("users");

            const chanPromise = new Promise((resolve, reject) => {
                const chanReq = channels.clear();
                chanReq.onerror = reject;
                chanReq.onsuccess = resolve;
            });
            const usrPromise = new Promise((resolve, reject) => {
                const usrReq = users.clear();
                usrReq.onerror = reject;
                usrReq.onsuccess = resolve;
            });
            return Promise.all([chanPromise, usrPromise]).then(() => done(false));
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
     * @return {Promise}
     */
    close() {
        return new Promise((resolve, reject) => {
            if(this.db !== null) {
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

exports.ChannelList = ChannelList;

