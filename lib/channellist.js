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
    var request = indexedDB.open("channels", VERSION),
        that = this;

    request.onupgradeneeded = function(e) {
        that.db = e.target.result;
        var users = channels.createObjectStore("users", { keyPath: "id", autoIncrement: true });
        users.createIndex("typename", "type,name", { unique: true });
        var channels = channels.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
        channels.createIndex("typename", "type,name", { unique: true });
        channels.createIndex("type", "type", { unique: false });
    };
    
    request.onsuccess = function(e) {
        that.db = e.target.result;
    };
    
    //XXX What if the array's contents are changed externally?
    Object.defineProperties({
        "channels": {
            get() {

            }
        },
        "users": {
            get() {
            }
        }
    });
}
ChannelList.prototype = Object.create(EventTarget.prototype);
ChannelList.prototype.constructor = ChannelList;

ChannelList.prototype.db;

ChannelList.prototype.getChannelId = function(name, type) {
};

ChannelList.prototype.getChannel = function(id, callback, type) {
    if(type) {
        id = this.getChannelId(id, type);
    }
    
    var transaction = this.db.transaction("channels"),
        store       = transaction.objectStore("channels");
    var req = store.get(id);

    req.onsuccess = function(event) {
        callback(Object.create(Channel.prototype,request.result));
    };
};

ChannelList.prototype.addChannels = function(channels) {
    var transaction = this.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels");
    channels.forEach(function(channel) {
        if(channel instanceof Channel) {
            store.add(channel);
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
        id = this.getChannelId(id, type);
    }

    var transaction = this.db.transaction("channels", "redwrite"),
        store       = transaction.objectStore("channels");

    var req = store.delete(id);

    req.onsuccess = () => { emit("channeldeleted", id) };
};

ChannelList.prototype.channelExists = function(id, type) {
    
};

ChannelList.prototype.liveStatus = function(type) {
    return this.getChannelsByType(type).some(function(channel) {
        return channel.live;
    });
};

ChannelList.prototype.getChannelsByType = function(type, callback) {
    if(!type)
        callback(this.channels);
    else {
        var transaction = this.db.transaction(["channels"], "readwrite"),
            store       = transaction.objectStore("channels"),
            retchans    = new Array();
            
        transaction.oncomplete = function(e) {
            callback(retchans);
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