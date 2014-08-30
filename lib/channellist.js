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
 

/*
    ChannelList Object
*/
function ChannelList(options) {
    this.initialize(options);
    
    database = new Object();
    var request = indexedDB.open("channels", VERSION);
    
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
ChannelList.prototype.database = {};

ChannelList.prototype.getChannelId = function(name, type) {
};

ChannelList.prototype.getChannel = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type);
    }

};

ChannelList.prototype.addChannels = function(channels) {
    emit("channeladded");
};

ChannelList.prototype.setChannel = function(id, channel, type) {
    if(type) {
        id = this.getChannelId(id, type);
    }
    emit("channelupdated");
};

ChannelList.prototype.removeChannel = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type);
    }
    emit("channeldeleted");
};

ChannelList.prototype.channelExists = function(id, type) {
    if(type) {
        id = this.getChannelId(id, type);
    }
    
};

ChannelList.prototype.liveStatus = function(type) {
    return this.getChannelsByType(type).some(function(channel) {
        return channel.live;
    });
};

ChannelList.prototype.getChannelsByType = function(type) {
    if(!type)
        return this.channels;
    else {
    }
};

// singleton
const instance = new ChannelList();
exports = {
    get ChannelList() {
        return instance;
    }
};
