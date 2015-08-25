/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channel list Object
 */

"use strict";

//DB Version
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


/*
    ChannelList Object
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

ChannelList.prototype.db = null;

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

    req.onsuccess = function() {
        if(req.result)
            resolve(Object.assign(new User(), req.result));
        else
            reject();
    };
    req.onerror = reject;

    return promise;
});

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
            req         = store.add(channel);

        req.onsuccess = () => {
            channel.id = req.result;
            resolve(channel);
            emit(this, "channelsadded", [channel]);
        };
        req.onerror = reject;

        return promise;
    }
});

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
                        var req = store.add(channel);
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

ChannelList.prototype.addUser = function(user) {
    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    let { promise, resolve, reject } = defer();

    var req = store.add(user);
    req.onsuccess = () => {
        user.id = req.result;
        resolve(user);
        emit(this, "useradded", user);
    };
    req.onerror = reject;

    return promise;
};

ChannelList.prototype.setChannel = async(function*(channel) {
    console.info("ChannelList.setChannel("+channel.id+")");
    if(!("id" in channel)) {
        channel.id = yield this.getChannelId(channel.login, channel.type);
    }

    let { promise, resolve, reject } = defer();

    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");

    channel.lastModified = Date.now();

    var req = store.put(channel);

    req.onsuccess = () => {
        this.getChannel(req.result).then((chan) => {
            resolve(chan);
            emit(this, "channelupdated", chan);
        });
    };
    req.onerror = reject;

    return promise;
});

ChannelList.prototype.setUser = async(function*(user) {
    if(!("id" in user)) {
        yield user.id = this.getUserId(user.login, user.type);
    }

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");
    var req = store.put(user);

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

ChannelList.prototype.channelExists = function(id, type) {
    return this.getChannel(id, type).then((channel) => { return !!channel; });
};

ChannelList.prototype.liveStatus = async(function*(type) {
    let channels = yield this.getChannelsByType(type);
    return channels.some((channel) => channel.live);
});

ChannelList.prototype.getChannelsByType = function(type) {
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels"),
        retchans    = [];

    let { promise, resolve, reject } = defer();

    transaction.onerror = reject;

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = function(event) {
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

        index.openCursor(keyRange).onsuccess = function(event) {
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

ChannelList.prototype.getUsersByType = function(type) {
    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        retusrs     = [];

    let { promise, resolve, reject } = defer();

    transaction.onerror = reject;

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = function(event) {
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

        index.openCursor(keyRange).onsuccess = function(event) {
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

ChannelList.prototype.getUsersByFavorite = async(function*(channel) {
    let users = yield this.getUsersByType(channel.type);
    return users.filter((user) => {
        console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
        return user.favorites.some((channame) => { return channame == channel.login; });
    });
});

ChannelList.prototype.removeUsersWithFavorite = async(function*(channelId) {
    let channel = yield this.getChannel(channelId);
    let users = yield this.getUsersByFavorite(channel);
    return all(users.map((user) => {
        console.log("Removing user "+user.login+" because he follows "+channel.login);
        return this.removeUser(user.id);
    }));
});

exports.ChannelList = ChannelList;

