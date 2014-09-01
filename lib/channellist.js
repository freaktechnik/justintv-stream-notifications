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

// callback/promising
const { defer } = require("sdk/lang/functional");

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

    request.onupgradeneeded = (function(e) {
        this.db = e.target.result;
        var users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
        users.createIndex("typename", ["type","login"], { unique: true });
        users.createIndex("type", "type", { unique: false });
        //users.createIndex("id", "id", { unique: true });
        var channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
        channels.createIndex("typename", ["type","login"], { unique: true });
        channels.createIndex("type", "type", { unique: false });
        //channels.createIndex("id", "id", { unique: true });
        request.oncomplete = (function () {
            emit(this, "ready");
        }).bind(this);
    }).bind(this);

    request.onsuccess = (function(e) {
        this.db = e.target.result;

        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels"),
            retchans    = new Array(),
            minDate     = Date.now() - prefs.channellist_cacheTime; //now - 10 min
        var req = store.index("typename").openCursor().onsuccess = (function(event) {
            var cursor = event.target.result;

            if(cursor) {
                if(cursor.value.lastUpdated < minDate) {
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

ChannelList.prototype.getChannelId = function(name, type, callback) {
    var transaction = this.db.transaction("channels"),
        index       = transaction.objectStore("channels").index("typename");

    callback = defer(callback);

    var req = index.get([type, name]);
    req.onsuccess = function(event) {
        if(req.result)
            callback(req.result.id);
        else
            callback();
    };
};

ChannelList.prototype.getUserId = function(name, type, callback) {
    var transaction = this.db.transaction("users"),
        index       = transaction.objectStore("users").index("typename");

    callback = defer(callback);

    var req = index.get([type, name]);
    req.onsuccess = function(event) {
        if(req.result)
            callback(req.result.id);
        else
            callback();
    };
};

ChannelList.prototype.getChannel = function(callback, id, type) {
    if(type) {
        this.getChannelId(id, type, this.getChannel.bind(this, callback));
        return;
    }

    callback = defer(callback);

    if(!id) {
        callback();
        return;
    }

    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels");
    var req = store.get(id);

    req.onsuccess = function() {
        if(req.result)
            callback(Object.assign(new Channel(), req.result));
        else
            callback();
    };
    req.onerror = function() {
        // channel doesn't exist
        callback();
    };
};

ChannelList.prototype.getUser = function(callback, id, type) {
    if(type) {
        this.getUserId(id, type, this.getUser.bind(this, callback));
        return;
    }

    callback = defer(callback);

    if(!id) {
        callback();
        return;
    }

    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        req         = store.get(id);

    req.onsuccess = function() {
        if(req.result)
            callback(Object.assign(new User(), req.result));
        else
            callback();
    };
    req.onerror = function() {
        // channel doesn't exist
        callback();
    };
};

ChannelList.prototype.addChannel = function(channel) {
    console.info("ChannelList.addChannel("+channel.login+")");
    channel.lastModified = Date.now();

    this.getChannel((fChan) => {
        if(!fChan) {
            var transaction = this.db.transaction("channels", "readwrite"),
                store       = transaction.objectStore("channels"),
                req         = store.add(channel);
            req.onsuccess = (function() {
                channel.id = req.result;
                emit(this, "channelsadded", [channel]);
            }).bind(this);
            req.onerror = () => { console.error(req.error); };
        }
    }, channel.login, channel.type);
};

ChannelList.prototype.addChannels = function(channels) {
    console.info("ChannelList.addChannels(channels)");
    if(channels instanceof Channel) {
        this.addChannel(channels);
    }
    else if(Array.isArray(channels)) {
        if(channels.length == 1) {
            this.addChannel(channels[0]);
        }
        else if(channels.length > 1) {
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
            transaction.oncomplete = ((e) => {
                if(addedChannels.length > 0)
                    emit(this, "channelsadded", addedChannels);
            }).bind(this);
        }
    }
};

ChannelList.prototype.addUser = function(user) {
    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    var req = store.add(user);
    req.onsuccess = (function() {
        user.id = req.result;
        emit(this, "useradded", user);
    }).bind(this);
};

ChannelList.prototype.setChannel = function(channel) {
    if(!channel.id) {
        this.getChannelId(channel.login, channel.type, (function(channelId) {
            channel.id = channelId;
            this.setChannel(channel);
        }).bind(this));
        return;
    }

    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");

    channel.lastModified = Date.now();

    var req = store.put(channel);

    req.onsuccess = (function() {
        this.getChannel((function(chan) {
            emit(this, "channelupdated", chan);
        }).bind(this), req.result);
    }).bind(this);
    req.onerror = function(e) { console.error(e); };
};

ChannelList.prototype.setUser = function(user) {
    if(!user.id) {
        this.getUserId(user.login, user.type, (function(userId) {
            user.id = userId;
            this.setUser(user);
        }).bind(this));
        return;
    }

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");
    var req = store.put(user);

    req.onsuccess = (function() {
        this.getUser((function(usr) {
            if(usr)
                emit(this, "userupdated", usr);
        }).bind(this), req.result);
    }).bind(this);
};

ChannelList.prototype.removeChannel = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type, this.removeChannel.bind(this));
        return;
    }
    emit(this, "beforechanneldeleted", id);
    this.getChannel((function(channel) {
        this.removeUsersWithFavorite(id, (function() {
            var transaction = this.db.transaction("channels", "readwrite"),
                store       = transaction.objectStore("channels");

            var req = store.delete(id);
            console.log("queued deletion");

            req.onsuccess = (() => { emit(this, "channeldeleted", channel); }).bind(this);
        }).bind(this));
    }).bind(this), id);
};

ChannelList.prototype.removeUser = function(id, type) {
    if(type) {
        id = this.getUserId(id, type, this.removeUser.bind(this));
        return;
    }
    this.getUser((function(user) {
        var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

        var req = store.delete(id);

        req.onsuccess = (() => { emit(this, "userdeleted", user); }).bind(this);
    }).bind(this), id);
};

ChannelList.prototype.channelExists = function(callback, id, type) {
    this.getChannel((channel) => { defer(callback)(!!channel); }, id, type);
};

ChannelList.prototype.liveStatus = function(type, callback) {
    this.getChannelsByType(type, function(channels) {
        defer(callback)(channels.some(function(channel) {
            return channel.live;
        }));
    });
};

ChannelList.prototype.getChannelsByType = function(type, callback) {
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels"),
        retchans    = new Array();

    callback = defer(callback);

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = function(event) {
            var cursor = event.target.result;

            if(cursor) {
                retchans.push(Object.assign(new Channel(), cursor.value));
                cursor.continue();
            }
            else if(callback) {
                callback(retchans);
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
                callback(retchans);
            }
        };
    }
};

ChannelList.prototype.getUsersByType = function(type, callback) {
    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        retusrs     = new Array();

    callback = defer(callback);

    if(!type) {
        var req = store.index("typename").openCursor().onsuccess = function(event) {
            var cursor = event.target.result;

            if(cursor) {
                retusrs.push(Object.assign(new User(), cursor.value));
                cursor.continue();
            }
            else if(callback) {
                callback(retusrs);
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
            else if(callback) {
                callback(retusrs);
            }
        };
    }
};

ChannelList.prototype.getUsersByFavorite = function(channel, callback) {
    this.getUsersByType(channel.type, function(users) {
        var retusrs = [];
        users.forEach(function(user) {
            console.log("Scanning user "+user.login+" with the favorites "+user.favorites);
            if(user.favorites.some((channame) => { return channame == channel.login; })) {
                console.log("Adding user "+user.login+" to the list, because he follows "+channel.login);
                retusrs.push(user);
            }
        });
        defer(callback)(retusrs);
    });
};

ChannelList.prototype.removeUsersWithFavorite = function(channelId, callback) {
    this.getChannel((function(channel) {
        this.getUsersByFavorite(channel, (function(users) {
            users.forEach(function(user) {
                console.log("Removing user "+user.login+" because he follows "+channel.login);
                this.removeUser(user.id);
            }, this);
        }).bind(this));
        if(callback)
            defer(callback)();
    }).bind(this), channelId);
};

exports.ChannelList = ChannelList;

