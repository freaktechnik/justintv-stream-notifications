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
 * @default 1
 */
const VERSION = 1;

/**
 * Database name
 * @const {string}
 * @default "channellist"
 */
const NAME = "channellist";

// setup event handling
const { emit } = require("sdk/event/core"),
      { EventTarget } = require("sdk/event/target");

// promising
const { all, defer } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { indexedDB, IDBKeyRange } = require("sdk/indexed-db"),
      { prefs } = require("sdk/simple-prefs");

const { Channel, User, deserialize } = require("./core");

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
 * @constructor
 * @argument {Object} options - Event listener object
 * @extends external:sdk/event/target.EventTarget
 * @alias module:channel/list.ChannelList
 * @fires module:channel/list.ChannelList#ready
 */
function ChannelList(options) {
    this.initialize(options);

    this.openDB(NAME);
}
ChannelList.prototype = Object.create(EventTarget.prototype);
ChannelList.prototype.constructor = ChannelList;

/**
 * Reference to the DB
 * @type {IndexedDB?}
 */
ChannelList.prototype.db = null;

/**
 * Opens the DB, initializes the schema if it's a new DB or sets channels
 * offline that were online and have last been updated a certain time ago.
 * @argument {string} name - Name of the DB to open.
 * @argument {boolean} [dontTry=false] - Don't try to fix the DB.
 * @return {Promise} The promise resolves as soon as the DB is ready.
 * @fires module:channel/list.ChannelList#ready
 * @fires module:channel/list.ChannelList#fixdb
 */
ChannelList.prototype.openDB = function(name, dontTry = false) {
    console.log("ChannelList.openDB(",name,",",dontTry,")");
    let { promise, resolve, reject } = defer();
    let request = indexedDB.open(name, VERSION);

    // Set up DB
    request.onupgradeneeded = (e) => {
        this.db = e.target.result;
        let users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
        users.createIndex("typename", ["type","login"], { unique: true });
        users.createIndex("type", "type", { unique: false });
        //users.createIndex("id", "id", { unique: true });
        let channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
        channels.createIndex("typename", ["type","login"], { unique: true });
        channels.createIndex("type", "type", { unique: false });
        //channels.createIndex("id", "id", { unique: true });
    };

    // DB is ready
    request.onsuccess = (e) => {
        this.db = e.target.result;

        // Set all channels to offline, that haven't been updated in a certain time.
        let transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            retchans    = [],
            minDate     = Date.now() - prefs.channellist_cacheTime; //now - 10 min
        let req = store.index("typename").openCursor();

        req.onsuccess = (event) => {
            var cursor = event.target.result;

            if(cursor) {
                if(cursor.value.lastModified < minDate) {
                    cursor.value.live = false;
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

    return promise;
};

/**
 * Gets the ID of a channel, if it is in the ChannelList
 * @argument {string} name - Login of the channel.
 * @argument {string} type - Type of the channel.
 * @return {Promise.<number>} A promise that resolves to the ID if the channel
 *                            exists. Else gets rejected.
 */
ChannelList.prototype.getChannelId = function(name, type) {
    console.info("ChannelList.getChannelId("+name+","+type+")");
    let transaction = this.db.transaction("channels"),
        index       = transaction.objectStore("channels").index("typename");

    let { promise, resolve, reject } = defer();

    var req = index.get([type, name]);
    req.onsuccess = function(event) {
        if(req.result)
            resolve(req.result.id);
        else
            reject();
    };
    req.onerror = reject;

    return promise;
};

/**
 * Gets the ID of a user, if it is in the ChannelList.
 * @argument {string} name - Login of the user.
 * @argument {string} type - Type of the user.
 * @return {Promise.<number>} A promise that resolves to the ID if the user
 *                            exists. Else gets rejected.
 */
ChannelList.prototype.getUserId = function(name, type) {
    var transaction = this.db.transaction("users"),
        index       = transaction.objectStore("users").index("typename");

    let { promise, resolve, reject } = defer();

    var req = index.get([type, name]);
    req.onsuccess = function(event) {
        if(req.result)
            resolve(req.result.id);
        else
            reject();
    };

    return promise;
};

/**
 * Get the specified channel.
 * @argument {(number|string)} id - ID of login of the channel.
 * @argument {string} [type] - Type of the channel if a login was passed as
 *                             first argument.
 * @return {Promise.<module:channel/core.Channel>} Gets rejected if the channel
 *                                                 doesn't exist or no arguments
 *                                                 are passed.
 * @method
 */
ChannelList.prototype.getChannel = async(function*(id, type) {
    console.info("ChannelList.getChannel("+id+")");
    if(type) {
        id = yield this.getChannelId(id, type);
    }

    let { promise, resolve, reject } = defer();

    if(!id) {
        throw "No ID specified";
    }

    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels");
    var req = store.get(id);

    req.onsuccess = function() {
        if(req.result)
            resolve(deserialize(req.result));
        else
            reject();
    };
    req.onerror = reject;

    return promise;
});

/**
 * Get the specified user.
 * @argument {(number|string)} id - ID of login of the user.
 * @argument {string} [type] - Type of the user if a login was passed as first
 *                             argument.
 * @return {Promise.<module:channel/core.User>} Gets rejected if the user doesn't
 *                                             exist or no arguments are passed.
 * @method
 */
ChannelList.prototype.getUser = async(function*(id, type) {
    if(type) {
        id = yield this.getUserId(id, type);
    }

    let { promise, resolve, reject } = defer();

    if(!id) {
        throw "No ID specified";
    }

    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        req         = store.get(id);

    req.onsuccess = () => {
        if(req.result)
            resolve(deserialize(req.result));
        else
            reject();
    };
    req.onerror = reject;

    return promise;
});

/**
 * Add a channel to the list.
 * @argument {module:channel/core.Channel} channel - The channel to add
 * @return {Promise.<module:channel/core.Channel>} Resolves with a channel that has
 *                                              the ID set. Gets rejected if an
 *                                              error occurs.
 * @throws {string} If the channel is already in the list.
 * @fires module:channel/list.ChannelList#channelsadded
 * @method
 */
ChannelList.prototype.addChannel = async(function*(channel) {
    console.info("ChannelList.addChannel("+channel.login+")");
    channel.lastModified = Date.now();

    if(yield this.channelExists(channel.login, channel.type)) {
        throw "Channel already exists";
    }
    else {
        let { promise, resolve, reject } = defer();
        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            req         = store.add(channel.serialize());

        req.onsuccess = () => {
            channel.id = req.result;
            resolve(channel);
            emit(this, "channelsadded", [channel]);
        };
        req.onerror = reject;

        return promise;
    }
});

/**
 * Add multiple channels to the list.
 * @argument {Array.<module:channel/core.Channel>} channels - The channels to add
 * @return {Promise.<Array.<module:channel/core.Channel>>} Resolves with an array
 *                                                       of channels that were
 *                                                      added with their ID set.
 * @fires module:channel/list.ChannelList#channelsadded
 */
ChannelList.prototype.addChannels = function(channels) {
    console.info("ChannelList.addChannels(channels)");
    if(channels instanceof Channel) {
        return this.addChannel(channels).then((channel) => [channel]);
    }
    else if(Array.isArray(channels)) {
        if(channels.length == 1) {
            return this.addChannel(channels[0]).then((channel) => [channel]);
        }
        else if(channels.length > 1) {
            let { promise, resolve, reject } = defer();
            var transaction = this.db.transaction("channels", "readwrite"),
                store       = transaction.objectStore("channels"),
                index       = store.index("typename"),
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

            return promise;
        }
    }
    return Promise.resolve([]);
};

/**
 * Add a user to the list.
 * @argument {module:channel/core.User} channel - The channel to add
 * @return {Promise.<module:channel/core.User>} Resolves with a user that has the
 *                                            ID set. Gets rejected if an error
 *                                            occurs.
 * @fires module:channel/list.ChannelList#useradded
 * @method
 */
ChannelList.prototype.addUser = async(function*(user) {
    if(yield this.userExists(user.login, user.type))
        throw "User already exists";

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    let { promise, resolve, reject } = defer();

    var req = store.add(user.serialize());
    req.onsuccess = () => {
        user.id = req.result;
        resolve(user);
        emit(this, "useradded", user);
    };
    req.onerror = reject;

    return promise;
});

/**
 * Change the data of a channel
 * @argument {module:channel/core.Channel} channel - The new data for the channel
 * @return {Promise.<module:channel/core.Channel>} Resolves with the new version
 *                                                of the channel stored in the
 *                                                ChannelList. Gets rejected if
 *                                                something went wrong.
 * @fires module:channel/list.ChannelList#channelupdated
 * @method
 */
ChannelList.prototype.setChannel = async(function*(channel) {
    console.info("ChannelList.setChannel("+channel.id+")");
    if(!("id" in channel)) {
        channel.id = yield this.getChannelId(channel.login, channel.type);
    }

    let { promise, resolve, reject } = defer();

    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");

    channel.lastModified = Date.now();

    var req = store.put(channel.serialize());

    req.onsuccess = () => {
        this.getChannel(req.result).then((chan) => {
            resolve(chan);
            emit(this, "channelupdated", chan);
        });
    };
    req.onerror = reject;

    return promise;
});

/**
 * Change the data of a user
 * @argument {module:channel/core.User} user - The new data for the user.
 * @return {Promise.<module:channel/core.User>} Resolves with the new version of
 *                                             the user stored in the
 *                                             ChannelList. Gets rejected if
 *                                             something went wrong.
 * @fires module:channel/list.ChannelList#userupdated
 * @method
 */
ChannelList.prototype.setUser = async(function*(user) {
    if(!("id" in user)) {
        user.id = yield this.getUserId(user.login, user.type);
    }

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");
    var req = store.put(user.serialize());

    let { promise, resolve, reject } = defer();

    req.onsuccess = () => {
        this.getUser(req.result).then((usr) => {
            resolve(usr);
            emit(this, "userupdated", usr);
        });
    };
    req.onerror = reject;

    return promise;
});

/**
 * Remove a channel from the list. Also removes all users that have this channel
 * as favorite.
 * @argument {(number|string)} id - ID or login of the channel to remove.
 * @argument {string} [type] - Type of the channel if no ID was passed.
 * @return {Promise.<module:channel/core.Channel>} Resolves to the removed
 *                                                channel.
 * @fires module:channel/list.ChannelList#beforechanneldeleted
 * @fires module:channel/list.ChannelList#channeldeleted
 * @method
 */
ChannelList.prototype.removeChannel = async(function*(id, type) {
    console.info("ChannelList.removeChannel("+id+")");
    if(type) {
        id = yield this.getChannelId(id, type);
    }

    emit(this, "beforechanneldeleted", id);
    let channel = yield this.getChannel(id);
    yield all([
        this.removeUsersWithFavorite(id),
        (() => {
            var transaction = this.db.transaction("channels", "readwrite"),
                store       = transaction.objectStore("channels");

            let { promise, resolve, reject } = defer();

            var req = store.delete(id);
            console.log("queued deletion");

            req.onsuccess = () => {
                resolve(channel);
                emit(this, "channeldeleted", channel);
            };
            req.onerror = reject;

            return promise;
        })()
    ]);

    return channel;
});

/**
 * Remove a user from the list.
 * @argument {(number|string)} id - ID or login of the user to remove.
 * @argument {string} [type] - Type of the user if no ID was passed.
 * @return {Promise.<module:channel/core.User>} Resolves to the removed user.
 * @fires module:channel/list.ChannelList#userdeleted
 * @method
 */
ChannelList.prototype.removeUser = async(function*(id, type) {
    let user = yield this.getUser(id, type);

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    let { promise, resolve, reject } = defer();

    var req = store.delete(user.id);

    req.onsuccess = () => {
        resolve(user);
        emit(this, "userdeleted", user);
    };
    req.onerror = reject;

    return promise;
});

/**
 * Check if a channel is in the ChannelList.
 * @argument {(number|string)} id - ID or login of the channel.
 * @argument {string} [type] - Type of the channel if no ID was passed.
 * @return {Promise.<boolean>} Resolves to a boolean indicating if the channel
 *                             exists.
 */
ChannelList.prototype.channelExists = function(id, type) {
    console.info("ChannelList.channelExists(",id,",",type,")");
    let { promise, resolve } = defer();

    this.getChannel(id, type).then((channel) => resolve(!!channel), () => resolve(false));
    return promise;
};

/**
 * Check if a user is in the ChannelList.
 * @argument {(number|string)} id - ID or login of the user.
 * @argument {string} [type] - Type of the user if no ID was passed.
 * @return {Promise.<boolean>} Resolves to a boolean indicating if the user
 *                             exists.
 */
ChannelList.prototype.userExists = function(id, type) {
    console.info("ChannelList.userExists(",id,",",type,")");

    return this.getUser(id, type).then((channel) => !!channel, () => false);
};

/**
 * Get the live status of the ChannelList as a whole.
 * @argument {string} [type] - Check the live state of just the channels of the
 *                             specified type.
 * @return {Promise.<boolean>} Resolves to a boolean indicating, if there are
 *                             any live channels.
 * @todo make live an index and then get all the channels that are live and
 *       count those. That should be slightly faster than this O(n)
 *       operation on the array of all channels.
 * @method
 */
ChannelList.prototype.liveStatus = async(function*(type) {
    let channels = yield this.getChannelsByType(type);
    return channels.some((channel) => channel.live);
});

/**
 * Get all channels with the specified type
 * @argument {string} [type] - Type all the channels should have. If left out,
 *                             all channels are returned.
 * @return {Promise.<Array.<module:channel/core.Channel>>}
 */
ChannelList.prototype.getChannelsByType = function(type) {
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels"),
        retchans    = [];

    let { promise, resolve, reject } = defer();

    transaction.onerror = reject;

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = (event) => {
            var cursor = event.target.result;

            if(cursor) {
                retchans.push(deserialize(cursor.value));
                cursor.continue();
            }
            else {
                resolve(retchans);
            }
        };
    }
    else {
        var keyRange = IDBKeyRange.only(type),
            index    = store.index("type");

        index.openCursor(keyRange).onsuccess = (event) => {
            var cursor = event.target.result;

            if(cursor) {
                retchans.push(deserialize(cursor.value));
                cursor.continue();
            }
            else {
                resolve(retchans);
            }
        };
    }

    return promise;
};

/**
 * Get all users in the ChannelList with a certain type.
 * @argument {string} [type] - The type all returned users should have. If left
 *                             out all users are returned.
 * @return {Promise.<Array.<module:channel/core.User>>}
 */
ChannelList.prototype.getUsersByType = function(type) {
    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        retusrs     = [];

    let { promise, resolve, reject } = defer();

    transaction.onerror = reject;

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = (event) => {
            var cursor = event.target.result;

            if(cursor) {
                retusrs.push(deserialize(cursor.value));
                cursor.continue();
            }
            else {
                resolve(retusrs);
            }
        };
    }
    else {
        var keyRange = IDBKeyRange.only(type),
            index    = store.index("type");

        index.openCursor(keyRange).onsuccess = (event) => {
            var cursor = event.target.result;

            if(cursor) {
                retusrs.push(deserialize(cursor.value));
                cursor.continue();
            }
            else {
                resolve(retusrs);
            }
        };
    }

    return promise;
};

/**
 * Get all users that have the given channel as a favorite.
 * @argument {module:channel/core.Channel} channel - Channel to search users's
 *                                                  favorites for.
 * @return {Promise.<Array.<module:channel/core.User>>}
 * @method
 */
ChannelList.prototype.getUsersByFavorite = async(function*(channel) {
    let users = yield this.getUsersByType(channel.type);
    return users.filter((user) => {
        console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
        return user.favorites.indexOf(channel.login) !== -1;
    });
});

/**
 * Remove all users that have the given channel as favorite.
 * @argument {number} channelId - ID of the channel that users have favorited.
 * @return {Promise.<Array.<module:channel/core.User>>}
 * @fires module:channel/list.ChannelList#userdeleted
 * @method
 */
ChannelList.prototype.removeUsersWithFavorite = async(function*(channelId) {
    let channel = yield this.getChannel(channelId);
    let users = yield this.getUsersByFavorite(channel);
    return all(users.map((user) => {
        console.log("Removing user "+user.login+" because he follows "+channel.login);
        return this.removeUser(user.id);
    }));
});

/**
 * Get all channels that are favorited by a user.
 * @argument {module:channel/core.User} user - User to get the favorites of.
 * @return {Promise.<Array.<module:channel/core.Channel>>}
 * @method
 */
ChannelList.prototype.getChannelsByUserFavorites = async(function*(user) {
    let channels = yield this.getChannelsByType(user.type);
    return channels.filter((channel) => {
        return user.favorites.some((channame) => channame == channel.login);
    });
});

/**
 * Remove all channels that are favorited by a user.
 * @argument {number} userId - ID of the user whose favorites should be removed.
 * @return {Promise.<Array.<module:channel/core.Channel>>}
 * @fires module:channel/list.ChannelList#channeldeleted
 * @fires module:channel/list.ChannelList#beforechanneldeleted
 * @method
 */
ChannelList.prototype.removeChannelsByUserFavorites = async(function*(userId) {
    let user = yield this.getUser(userId);
    let channels = yield this.getChannelsByUserFavorites(user);
    return all(channels.map((channel) => {
        return this.removeChannel(channel.id);
    }));
});

/**
 * Clear all contents of the ChannelList. Sometimes reinitializes the DB from
 * scratch.
 * @fires module:channel/list.ChannelList#clear
 * @fires module:channel/list.ChannelList#ready
 * @return {Promise.<boolean>} If it resolves to true the DB was deleted.
 * @todo ensure both requests succeeded
 */
ChannelList.prototype.clear = function() {
    console.info("ChannelList.clear");
    let { promise, resolve, reject } = defer();

    const done = (hard = false) => {
        resolve(hard);
        emit(this, "clear", hard);
    };

    if(this.db !== null) {
        console.info("Clearing object stores");
        let transaction = this.db.transaction(["channels", "users"], "readwrite");
        let channels = transaction.objectStore("channels");
        let users = transaction.objectStore("users");

        let chanReq = channels.clear();
        let usrReq = users.clear();

        chanReq.onerror = reject;
        usrReq.onerror = reject;

        chanReq.onsuccess = () => {
            if(usrReq.readyState === "done")
                done();
        };
        usrReq.onsuccess = () => {
            if(chanReq.readyState === "done")
                done();
        };
        return promise;
    }
    else {
        console.info("Deleting and reinitializing the DB");
        /*
         * This is the slower path, so we avoid it. It needs all transactions
         * to be done in order to slowly erase the whole DB from the disk, just
         * to reinitialize it afterward.
         */
        let request = indexedDB.deleteDatabase(NAME);

        request.onerror = reject;
        request.onsuccess = () => done(true);
        request.onblocked = () => console.info("Deleting database was blocked");

        // Reopen the DB after it's been cleared. Don't try to fix it, if it
        // doesn't want to open.
        return promise.then(() => this.openDB(NAME, true));
    }
};

/**
 * Close the DB.
 * @return {Promise}
 */
ChannelList.prototype.close = function() {
    let { promise, resolve, reject } = defer();
    if(this.db) {
      this.db.close();
      resolve();
    }
    else {
      resolve();
    }
    return promise;
};

exports.ChannelList = ChannelList;

