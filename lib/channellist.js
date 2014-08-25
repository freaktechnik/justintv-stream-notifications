/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Channel list Objects
 */
 
"use strict";
 
// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var { mix, obscure } = require('sdk/core/heritage');
var { URL } = require("sdk/url");
var { exactArraySearch } = require("./utils");
var { prefs } = require("sdk/simple-prefs");
 
/*
    Channel Object
*/

// properties
Channel.prototype.live=false;
Channel.prototype.mute=false;
Channel.prototype.title='';
Channel.prototype.tabIndex=-1;
Channel.prototype.url=[];
Channel.prototype.urls=[];
Channel.prototype.name="";
Channel.prototype.login="";
//Channel.prototype.sources=null;
Channel.prototype.image=[];
Channel.prototype.status=0;
Channel.prototype.type = "";
Channel.prototype.style = {};
Channel.prototype.requestID = 0;
Channel.prototype.lastUpdated = 0;

Channel.QUEUED = 0;
Channel.FULL = 1;

// constructor
function Channel(status,type,channelObj) {
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();
    this.urls = new Array();
    this.image = new Array();
    this.type = type;
    //this.sources = new Sources(source);
    this.style = new Object();
    this.status = status;
    this.update();
    if(status==Channel.FULL) {
		this.addRichInfo(channelObj);
    }
}

// methods
Channel.prototype.addRichInfo=function(unifiedRspObj) {
        this.status = Channel.FULL;
        
        /*
            we need to push array elements like beckham, so we don't modify the prototype.
            Actually constructing new Array object in the constructor adds a per-item array.
        */
        this.url.push(new URL(unifiedRspObj.url));
        this.urls.push(unifiedRspObj.url);
        this.name = unifiedRspObj.name;
        this.login = unifiedRspObj.login;
        this.image.push(unifiedRspObj.panelAvatar);
        this.image.push(unifiedRspObj.notificationAvatar);
        
        // we don't always get these. Solve that.
        if(config.getPreference('panel.advancedStyle')) {
            this.style.bg = unifiedRspObj.backgroundColor;
            this.style.color = unifiedRspObj.textColor;
            this.style.linkColor = unifiedRspObj.linkColor;
            this.style.hasBgImage = !!unifiedRspObj.bgImage;
            if(this.style.hasBgImage) {
                this.style.bgImage = unifiedRspObj.bgImage;
            }
        }
        this.update();
};
Channel.prototype.toString = function() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
};

Channel.prototype.compareUrl = function(aUrl) {
    var url = new URL(aUrl);
    if(url.scheme.match(/http[s]?/)) {
        return this.url.some(function(vUrl) {
            return url.host&&vUrl.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]==url.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]&&url.path.contains(vUrl.path);
        });
    }
    return false;
};

/*
Channel.prototype.getFirstSourceObject = function(options) {
    var s = this.sources.getFirstSourceType();
    var sn = this.login;
    if(s==Source.TYPE_USERNAME) {
        sn = this.sources.usernames[0];
    }
    else if(s == Source.TYPE_USER) {
        sn = Source.TYPE_USER;
    }
    return new Source(s,sn,this.type,options);
};*/

Channel.prototype.update = function() {
    this.lastUpdated = Date.now();
};


exports.Channel = Channel;

/*
    ChannelList Object
*/
function ChannelList(options) {
    this.initialize(options);
    this.channels = new Object();
    this.initLength(0);
    this.users = new Object();
}
ChannelList.prototype = Object.create(EventTarget.prototype);

ChannelList.prototype.channels = {};
ChannelList.prototype.users = {};


// !!! should length count all the channels with every type? Should there be a type distinct length attribute?
ChannelList.prototype.initLength = function(l) {
    l = l || 0;
    if(this.channels.length>0) {
        l = this.channels.length;
    }
    if(this.channels.hasOwnProperty("length")) {
        delete this.channels.length;
    }
    this.channels = mix(this.channels,obscure({'length':l}));
    console.log("reset length to "+l);
};

ChannelList.prototype.setChannels = function(type,channelNames,rich) {
    rich = rich || false;
    if(channelNames.length>0&&channelNames[0]!='') {
        console.log("adding multiple channels");
        // check for added channels
        for each(var channel in channelNames) {
            this.addChannel(channel,type,rich);
        }
    }
};

ChannelList.prototype.addChannel = function(channel,type,rich) {
    var name = rich?channel.login:channel;
    if(rich&&!channel.full) {
        rich = false;
    }    
    var exists = this.channelExists(name,type);
    if(!this.channels.hasOwnProperty(type)) {
        console.log("Adding Provider "+type);
        this.channels[type] = new Object();
    }
    
    var channelType = this.channels[type];
    if(!exists&&!rich) {
        console.log("Adding channel "+name);
        this.channels.length++;
        channelType[name] = new Channel(Channel.QUEUED);
        channelType[name].login = name;
        emit(this, "completechannelinfo", name, type);
    }
    else if((!prefs.panel.advancedStyle||rich)&&!exists) {
        this.channels.length++;
        channelType[name] = new Channel(Channel.FULL,type,channel);
        emit(this, "channeladded",channelType[name]);
    }
    else if(channelType[name].status == Channel.QUEUED&&rich) {
        channelType[name].addRichInfo(channel);
        emit(this, "channeladded",channelType[name]);
    }
};

ChannelList.prototype.removeChannel = function(channel,type,del) {
    var channelObj = this.channels[type][channel];
    if(channelObj.live) {
        channelObj.live = false;
        channelObj.update();
        
        emit(this, "channeloffline", channelObj);
    }
    if(del) {
        emit(this, "channeldeleted", channelObj);
        delete this.channels[type][channel];
    }
};
ChannelList.prototype.setChannelLive = function(channel,type) {
    var channelObj = this.channels[type][channel];
    channelObj.live = true;
    channelObj.update();
    
    emit(this, "channellive", channelObj);
};

ChannelList.prototype.channelExists = function(channelName,type) {
    return this.channels.hasOwnProperty(type)&&this.channels[type].hasOwnProperty(channelName);
};

ChannelList.prototype.liveStatus = function(aType) {
    console.log("Length "+this.channels.length);

    if(this.channels.length>0) {
        if(!aType) {
            var channelType;
            for(var type in this.channels) {
                channelType = this.channels[type];
                for(var channel in channelType) {
                    if(channelType[channel].live)
                        return true;
                }
            }
        }
        else {
            for(var channel in this.channels[aType]) {
                if(this.channels[aType][channel].live)
                    return true;
            }
        }
    }
    return false;
};

ChannelList.prototype.getChannelsByType = function(type) {
    return this.channels[type];
};

exports.ChannelList = ChannelList;
