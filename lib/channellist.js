/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Channel list Object
 */
 
"use strict";

//DB Version
const VERSION = 1;

// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var { indexedDB, IDBKeyRange } = require("sdk/indexed-db");
const { mix, obscure } = require('sdk/core/heritage');
var { prefs } = require("sdk/simple-prefs");

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
        users.createIndex("typename", "type,name", { unique: true });
        var channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
        channels.createIndex("typename", "type,name", { unique: true });
        channels.createIndex("type", "type", { unique: false });
    }).bind(this);
    
    request.onsuccess = (function(e) {
        this.db = e.target.result;
    }).bind(this);
}
ChannelList.prototype = Object.create(EventTarget.prototype);
ChannelList.prototype.constructor = ChannelList;

ChannelList.prototype.db;

ChannelList.prototype.getChannelId = function(name, type, callback) {
    var transaction = this.db.transaction("channels"),
        index       = transaction.objectStore("channels").index("typename");

    var req = index.get({type: type, name: name});
    req.onsuccess = function(event) {
        callback(request.result.id);
    };
};

ChannelList.prototype.getUserId = function(name, type, callback) {
    var transaction = this.db.transaction("users"),
        index       = transaction.objectStore("users").index("typename");

    var req = index.get({type: type, name: name});
    req.onsuccess = function(event) {
        callback(request.result.id);
    };
};

ChannelList.prototype.getChannel = function(callback, id, type) {
    if(type) {
        id = this.getChannelId(id, type, this.getChannel.bind(this, callback));
        return;
    }
    
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels");
    var req = store.get(id);

    req.onsuccess = function() {
        callback(Object.assign(new Channel(), request.result));
    };
    req.onerror = function() {
        // channel doesn't exist
        callback(null);
    };
};

ChannelList.prototype.getUser = function(callback, id, type) {
    if(type) {
        id = this.getUserId(id, type, this.getUser.bind(this, callback));
        return;
    }
    
    var transaction = this.db.transaction("users"),
        store       = transaction.objectStore("users"),
        req = store.get(id);

    req.onsuccess = function() {
        callback(Object.assign(new User(), request.result));
    };
    req.onerror = function() {
        // channel doesn't exist
        callback(null);
    };
};

ChannelList.prototype.addChannels = function(channel) {
    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");
    if(channel instanceof Channel) {
        var req = store.add(channel);
        req.onsuccess = function() {
            channel.id = request.result.id;
            emit("channelsadded", [channel]);
        };
    }
    else {
       throw new Error("channel argument must be a Channel object"); 
    }    
};

ChannelList.prototype.addChannels = function(channels) {
    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");
    channels.forEach(function(channel) {
        if(channel instanceof Channel) {
            var req = store.add(channel);
            req.onsuccess = function() {
                channel.id = request.result.id;
            };
        }
        else {
           throw new Error("Individual channel must be a Channel object"); 
        }
    }, this);
    transaction.oncomplete = (e) => { emit("channelsadded", channels) };
};

ChannelList.prototype.addUser = function(user) {
    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    if(user instanceof User) {
        var req = store.add(channel);
        req.onsuccess = function() {
            channel.id = request.result.id;
            emit("useradded", user);
        };
    }
    else {
       throw new Error("Individual user must be a User object"); 
    }
};

ChannelList.prototype.setChannel = function(channel) {
    if(channel instanceof Channel) {        
        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels");
        var req = store.put(channel);

        req.onsuccess = function() {
            emit("channelupdated", channel);
        };
    }
    else {
        throw new Error("channel argument must be a Channel object");
    }
};

ChannelList.prototype.setUser = function(user) {
    if(user instanceof User) {        
        var transaction = this.db.transaction("users", "readwrite"),
            store       = transaction.objectStore("users");
        var req = store.put(user);

        req.onsuccess = function() {
            emit("userupdated", user);
        };
    }
    else {
        throw new Error("user argument must be a User object");
    }
};

ChannelList.prototype.removeChannel = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type, this.removeChannel.bind(this));
        return;
    }

    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");

    var req = store.delete(id);

    req.onsuccess = () => { emit("channeldeleted", id) };
};

ChannelList.prototype.removeUser = function(id, type) {
    if(type) {
        id = this.getUserId(id, type, this.removeUser.bind(this));
        return;
    }

    var transaction = this.db.transaction("users", "readwrite"),
        store       = transaction.objectStore("users");

    var req = store.delete(id);

    req.onsuccess = () => { emit("userdeleted", id) };
};

ChannelList.prototype.channelExists = function(callback, id, type) {
    this.getChannel((channel) => { callback(!!channel) }, id, type);
};

//XXX this has to be async or a generator
ChannelList.prototype.liveStatus = function(type) {
    return this.getChannelsByType(type).some(function(channel) {
        return channel.live;
    });
};

ChannelList.prototype.getChannelsByType = function(type, callback) {
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels"),
        retchans    = new Array();    
    if(!type) {
        var req = store.index("id").openCurstor().onsuccess = function(event) {
            var cursor = event.target.result;
            
            if(cursor) {
                retchans.push(Object.assign(new Channel(), cursor.value);
                cursor.continue();
            }
            else {
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
                retchans.push(Object.assign(new Channel(), cursor.value);
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
    if(!type) {
        var req = store.index("id").openCurstor().onsuccess = function(event) {
            var cursor = event.target.result;
            
            if(cursor) {
                retusrs.push(Object.assign(new User(), cursor.value);
                cursor.continue();
            }
            else {
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
                retusrs.push(Object.assign(new User(), cursor.value);
                cursor.continue();
            }
            else {
                callback(retusrs);
            }
        };
    }
};

ChannelList.prototype.getUsersByFavorite = function(channel, callback) {
    this.getUsersByType(channel.type, function(users) {
        var retusrs = [];
        users.forEach(function(user) {
            if(user.favorites.some((channame) => { channame == channel.login })) {
                retusrs.push(user);
            }
        });
        callback(retusrs);
    });
};

// singleton
const instance = new ChannelList();
exports = {
    get ChannelList() {
        return instance;
    }
};
