/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Channel list Objects
 */
 
"use strict";

//DB Version
const VERSION = 1;

// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var { indexedDB, IDBKeyRange } = require("sdk/indexed-db");
var { mix, obscure } = require('sdk/core/heritage');
var { prefs } = require("sdk/simple-prefs");

var { Channel, User } = require("./channeluser");
 

/*
    ChannelList Object
*/

function ChannelList(options) {
    this.initialize(options);
    
    // setup db
    var request = indexedDB.open("channels", VERSION);

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

    var req = index.get([type, name]);
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

    req.onsuccess = function(event) {
        callback(Object.create(Channel.prototype,request.result));
    };
    req.onerror = function(event) {
        // channel doesn't exist
        callback(null);
    };
};

ChannelList.prototype.addChannels = function(channels) {
    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");
    channels.forEach(function(channel) {
        if(channel instanceof Channel) {
            var req = store.add(channel);
            req.onsuccess = function(event) {
                channel.id = event.result.id;
            };
        }
        else {
           throw new Error("Individual channel must be a Channel object"); 
        }
        //emit("channeladded", channel);
    }, this);
    transaction.oncomplete = (e) => { emit("channelsadded", channels) };
};

ChannelList.prototype.setChannel = function(channel) {
    if(channel instanceof Channel) {        
        var transaction = this.db.transaction("channels", "readwrite"),
            store       = transaction.objectStore("channels");
        var req = store.put(channel);

        req.onsuccess = function(event) {
            emit("channelupdated", channel);
        };
    }
    else {
        throw new Error("channel argument must be a Channel object");
    }
};

ChannelList.prototype.removeChannel = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type, this.removeChannel.bind(this));
        return;
    }

    var transaction = this.db.transaction("channels", "redwrite"),
        store       = transaction.objectStore("channels");

    var req = store.delete(id);

    req.onsuccess = () => { emit("channeldeleted", id) };
};

ChannelList.prototype.channelExists = function(callback, id, type) {
    this.getChannel((channel) => { callback(!!channel) }, id, type);
};

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
                retchans.push(Object.create(Channels.prototype, cursor.value);
                cursor.continue();
            }
            else {
                callback(retchans);
            }
        };
    }
    else {
        var keyRange    = IDBKeyRange.only(type),
            index       = store.index("type");

        index.openCursor(keyRange).onsuccess = function(event) {
            var cursor = event.target.result;

            if(cursor) {
                retchans.push(Object.create(Channels.prototype, cursor.value);
                cursor.continue();
            }
            else {
                callback(retchans);
            }
        };
    }
};

// singleton
const instance = new ChannelList();
exports = {
    get ChannelList() {
        return instance;
    }
};
