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

    request.onsuccess = (function(e) {
        this.db = e.target.result;

        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            retchans    = [],
            minDate     = Date.now() - prefs.channellist_cacheTime; //now - 10 min
        var req = store.index("typename").openCursor().onsuccess = (function(event) {
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
        }).bind(this);
    }).bind(this);

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

ChannelList.prototype.getChannel = function(id, type) {
    console.info("ChannelList.getChannel("+id+")");
    if(type) {
        return this.getChannelId(id, type).then(this.getChannel.bind(this));
    }

    let { promise, resolve, reject } = defer();

    if(!id) {
        reject();
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
};

ChannelList.prototype.getUser = function(id, type) {
    if(type) {
        return this.getUserId(id, type).then(this.getUser.bind(this));
    }

    let { promise, resolve, reject } = defer();

    if(!id) {
        reject();
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
};

ChannelList.prototype.addChannel = function(channel) {
    console.info("ChannelList.addChannel("+channel.login+")");
    channel.lastModified = Date.now();

    let { promise, resolve, reject } = defer();

    this.getChannel(channel.login, channel.type).then(() => {
        reject("Channel already exists");
    },() => {
        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            req         = store.add(channel);


        req.onsuccess = () => {
            channel.id = req.result;
            resolve(channel);
            emit(this, "channelsadded", [channel]);
        };
        req.onerror = reject;
    });

    return promise;
};

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

ChannelList.prototype.setChannel = function(channel) {
    console.info("ChannelList.setChannel("+channel.id+")");
    if(!channel.id) {
        return this.getChannelId(channel.login, channel.type).then((channelId) => {
            channel.id = channelId;
            console.log("channel id", channelId);
            return this.setChannel(channel);
        });
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
};

ChannelList.prototype.setUser = function(user) {
    if(!user.id) {
        return this.getUserId(user.login, user.type).then((userId) => {
            user.id = userId;
            return this.setUser(user);
        });
    }

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");
    var req = store.put(user);

    let { promise, resolve, reject } = defer();

    req.onsuccess = () => {
        this.getUser(req.result).then((usr) => {
            if(usr) {
                resolve(usr);
                emit(this, "userupdated", usr);
            }
            else {
                reject();
            }
        });
    };

    return promise;
};

ChannelList.prototype.removeChannel = function(id, type) {
    console.info("ChannelList.removeChannel("+id+")");
    if(type) {
        return this.getChannelId(id, type).then(this.removeChannel.bind(this));
    }

    emit(this, "beforechanneldeleted", id);
    return this.getChannel(id).then((channel) => {
        return all([this.removeUsersWithFavorite(id), (() => {
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
        })()]).then(() => channel);
    });
};

ChannelList.prototype.removeUser = function(id, type) {
    return this.getUser(id, type).then((user) => {
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
};

ChannelList.prototype.channelExists = function(id, type) {
    return this.getChannel(id, type).then((channel) => { return !!channel; });
};

ChannelList.prototype.liveStatus = function(type) {
    return this.getChannelsByType(type).then((channels) => {
        return channels.some(function(channel) {
            return channel.live;
        });
    });
};

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

ChannelList.prototype.getUsersByFavorite = function(channel) {
    return this.getUsersByType(channel.type).then((users) => {
        return users.filter((user) => {
            console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
            return user.favorites.some((channame) => { return channame == channel.login; });
        });
    });
};

ChannelList.prototype.removeUsersWithFavorite = function(channelId) {
    return this.getChannel(channelId).then((channel) => {
        return this.getUsersByFavorite(channel).then((users) => {
            return all(users.map((user) => {
                console.log("Removing user "+user.login+" because he follows "+channel.login);
                return this.removeUser(user.id);
            }));
        });
    });
};

exports.ChannelList = ChannelList;

