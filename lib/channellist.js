/**
 * Channel list Object
 * @author Martin Giger
 * @license MPL-2.0
 * @module channellist
 * @requires module:channeluser
 */

"use strict";

/**
 * IndexedDB version
 * @const {number}
 * @default 1
 */
const VERSION = 1;

// setup event handling
const { emit } = require("sdk/event/core"),
      { EventTarget } = require("sdk/event/target");

// promising
const { all, defer } = require("sdk/core/promise");
let { Task: { async } } = require("resource://gre/modules/Task.jsm");

const { indexedDB, IDBKeyRange } = require("sdk/indexed-db"),
      { mix, obscure } = require('sdk/core/heritage'),
      { prefs } = require("sdk/simple-prefs");

const { Channel, User } = require("./channeluser");

/**
 * The ChannelList is ready to be used.
 * @event module:channellist.ChannelList#ready
 */
/**
 * Whenever one or more channels are added to the ChannelList this event is
 * fired.
 * @event module:channellist.ChannelList#channelsadded
 * @type {Array.<module:channeluser.Channel>}
 */
/**
 * Whenever a user is added to the ChannelList this event is fired.
 * @event module:channellist.ChannelList#useradded
 * @type {module:channeluser.User}
 */
/**
 * @event module:channellist.ChannelList#channelupdated
 * @type {module:channeluser.Channel}
 */
/**
 * @event module:channellist.ChannelList#userupdated
 * @type {module:channeluser.User}
 */
/**
 * Gets fired before a channel is deleted.
 * @event module:channellist.ChannelList#beforechanneldeleted
 * @type {number}
 */
/**
 * Gets fired after a channel was deleted.
 * @event module:channellist.ChannelList#channeldeleted
 * @type {module:channeluser.Channel}
 */
/**
 * @event module:channellist.ChannelList#userdeleted
 * @type {module:channeluser.User}
 */

/**
 * @constructor
 * @argument {Object} options - Event listener object
 * @extends external:sdk/event/target.EventTarget
 * @alias module:channellist.ChannelList
 * @fires module:channellist.ChannelList#ready
 */
function ChannelList(options) {
    this.initialize(options);

    // setup db
    var request = indexedDB.open("channellist", VERSION);

    request.onupgradeneeded = (e) => {
        this.db = e.target.result;
        var users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
        users.createIndex("typename", ["type","login"], { unique: true });
        users.createIndex("type", "type", { unique: false });
        //users.createIndex("id", "id", { unique: true });
        var channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
        channels.createIndex("typename", ["type","login"], { unique: true });
        channels.createIndex("type", "type", { unique: false });
        //channels.createIndex("id", "id", { unique: true });
        request.oncomplete = () => {
            emit(this, "ready");
        };
    };

    request.onsuccess = (e) => {
        this.db = e.target.result;

        // Set all channels to offline, that haven't been updated in a certain time.
        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            retchans    = [],
            minDate     = Date.now() - prefs.channellist_cacheTime; //now - 10 min
        var req = store.index("typename").openCursor();

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
                emit(this, "ready");
            }
        };
    };

    request.onerror = function() {
        console.error(request.error);
    };
}
ChannelList.prototype = Object.create(EventTarget.prototype);
ChannelList.prototype.constructor = ChannelList;

/**
 * Reference to the DB
 * @type {IndexedDB?}
 */
ChannelList.prototype.db = null;

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
 * @return {Promise.<module:channeluser.Channel>} Gets rejected if the channel
 *                                                doesn't exist.
 * @throws {string} If no argument is passed.
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
            resolve(Object.assign(new Channel(), req.result));
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
 * @return {Promise.<module:channeluser.User>} Gets rejected if the user doesn't
 *                                             exist.
 * @throws {string} If no argument is passed.
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
            resolve(Object.assign(new User(), req.result));
        else
            reject();
    };
    req.onerror = reject;

    return promise;
});

/**
 * Add a channel to the list.
 * @argument {module:channeluser.Channel} channel - The channel to add
 * @return {Promise.<module:channeluser.Channel>} Resolves with a channel that has
 *                                              the ID set. Gets rejected if an
 *                                              error occurs.
 * @throws {string} If the channel is already in the list.
 * @fires module:channellist.ChannelList#channelsadded
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
 * @argument {Array.<module:channeluser.Channel>} channels - The channels to add
 * @return {Promise.<Array.<module:channeluser.Channel>>} Resolves with an array
 *                                                       of channels that were
 *                                                      added with their ID set.
 * @fires module:channellist.ChannelList#channelsadded
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
                        req.onerror = () => { console.error(req.error); };
                    }
                    else {
                        console.log("Channel "+channel.login+" has already been added");
                    }
                };
            }, this);
            transaction.oncomplete = (e) => {
                if(addedChannels.length > 0) {
                    resolve(addedChannels);
                    emit(this, "channelsadded", addedChannels);
                }
            };

            return promise;
        }
    }
};

/**
 * Add a user to the list.
 * @argument {module:channeluser.User} channel - The channel to add
 * @return {Promise.<module:channeluser.User>} Resolves with a user that has the
 *                                            ID set. Gets rejected if an error
 *                                            occurs.
 * @fires module:channellist.ChannelList#useradded
 */
ChannelList.prototype.addUser = function(user) {
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
};

/**
 * Change the data of a channel
 * @argument {module:channellist.Channel} channel - The new data for the channel
 * @return {Promise.<module:channellist.Channel>} Resolves with the new version
 *                                                of the channel stored in the
 *                                                ChannelList. Gets rejected if
 *                                                something went wrong.
 * @fires module:channellust.ChannelList#channelupdated
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
 * @argument {module:channellist.User} user - The new data for the user.
 * @return {Promise.<module:channellist.User>} Resolves with the new version of
 *                                             the user stored in the
 *                                             ChannelList. Gets rejected if
 *                                             something went wrong.
 * @fires module:channellust.ChannelList#userupdated
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
 * @return {Promise.<module:channeluser.Channel>} Resolves to the removed
 *                                                channel.
 * @fires module:channellist.ChannelList#beforechanneldeleted
 * @fires module:channellist.ChannelList#channeldeleted
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
 * @return {Promise.<module:channeluser.User>} Resolves to the removed user.
 * @fires module:channellist.ChannelList#userdeleted
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
 * @return {Promise.<Array.<module:channeluser.Channel>>}
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
                retchans.push(Object.assign(new Channel(), cursor.value));
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
                retchans.push(Object.assign(new Channel(), cursor.value));
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
 * @return {Promise.<Array.<module:channeluser.User>>}
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
                retusrs.push(Object.assign(new User(), cursor.value));
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
                retusrs.push(Object.assign(new User(), cursor.value));
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
 * @argument {module:channeluser.Channel} channel - Channel to search users's
 *                                                  favorites for.
 * @return {Promise.<Array.<module:channeluser.User>>}
 * @method
 */
ChannelList.prototype.getUsersByFavorite = async(function*(channel) {
    let users = yield this.getUsersByType(channel.type);
    return users.filter((user) => {
        console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
        return user.favorites.some((channame) => { return channame == channel.login; });
    });
});

/**
 * Remove all users that have the given channel as favorite.
 * @argument {number} channelId - ID of the channel that users have favorited.
 * @return {Promise.<Array.<module:channeluser.User>>}
 * @fires module:channellist.ChannelList#userdeleted
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
 * @argument {module:channeluser.User} user - User to get the favorites of.
 * @return {Promise.<Array.<module:channeluser.Channel>>}
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
 * @return {Promise.<Array.<module:channeluser.Channel>>}
 * @fires module:channellist.ChannelList#channeldeleted
 * @fires module:channellist.ChannelList#beforechanneldeleted
 * @method
 */
ChannelList.prototype.removeChannelsByUserFavorites = async(function*(userId) {
    let user = yield this.getUser(userId);
    let channels = yield this.getChannelsByUserFavorites(user);
    return all(channels.map((channel) => {
        return this.removeChannel(channel.id);
    }));
});

exports.ChannelList = ChannelList;

