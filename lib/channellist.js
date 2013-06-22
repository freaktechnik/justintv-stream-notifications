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
var { exactArraySearch, RequestQueue } = require('./utils');
var { Request } = require("sdk/request");
var config = require('./config');
 
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
Channel.prototype.sources=null;
Channel.prototype.image=[];
Channel.prototype.status=0;
Channel.prototype.type = "";
Channel.prototype.style = {};
Channel.prototype.requestID = 0;
Channel.prototype.lastUpdated = 0;

Channel.QUEUED = 0;
Channel.FULL = 1;

// constructor
function Channel(status,source,channelObj) {
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();
    this.urls = new Array();
    this.image = new Array();
    this.type = source.channelType;
    this.sources = new Sources(source);
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
    return this.url.some(function(vUrl) {
        return url.host&&vUrl.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]==url.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]&&url.path.contains(vUrl.path);
    });
};

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
};

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
        delete this.channels.length;
    }
    this.channels = mix(this.channels,obscure({'length':l}));
    console.log("reset length to "+l);
};

ChannelList.prototype.setChannels = function(source,channelNames,rich) {
    rich = rich || false;
    if(channelNames.length>0&&channelNames[0]!='') {
        console.log("adding multiple channels");
        // check for added channels
        for each(var channel in channelNames) {
            this.addChannel(channel,source,rich);
        }
    }
    
    // check for removed channels
    // We don't need to check the usernames here, since this is done right after the entry field gets changed
    var channelType = this.channels[source.channelType];
    for(var channel in channelType) {
        if(!exactArraySearch(channelNames,channel,rich)) {
            if(channelType[channel].sources.onlySourceSet(source)) {
                this.removeChannel(channel, source.channelType, true);
            }
            else if(channelType[channel].sources.isSourceSet(source)) {
                channelType[channel].sources.unsetSource(source);
            }
        }
    }
};

ChannelList.prototype.addChannel = function(channel,source,rich) {
    var name = rich?channel.login:channel;
    console.log("Adding channel "+name);
    if(rich&&!channel.full) {
        rich = false;
    }    
    var exists = this.channelExists(name,source.channelType);
    if(!this.channels.hasOwnProperty(source.channelType)) {
        this.channels[source.channelType] = new Object();
    }
    
    var channelType = this.channels[source.channelType];
    if(!exists&&!rich) {
        this.channels.length++;
        channelType[name] = new Channel(Channel.QUEUED,source);
        channelType[name].login = name;
        emit(this, "completechannelinfo", name, source);
    }
    else if((!config.getPreference("panel.advancedStyle")||rich)&&!exists) {
        this.channels.length++;
        channelType[name] = new Channel(Channel.FULL,source,channel);
        emit(this, "channeladded",channelType[name]);
    }
    else if(channelType[name].status == Channel.QUEUED&&rich) {
        channelType[name].addRichInfo(channel);
        emit(this, "channeladded",channelType[name]);
    }
    else
        channelType[name].sources.setSource(source);
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

ChannelList.prototype.liveStatus = function() {
    console.log("Length "+this.channels.length);
    var channelType;
    if(this.channels.length>0) {
        for(var type in this.channels) {
            channelType = this.channels[type];
            for(var channel in channelType) {
                if(channelType[channel].live)
                    return true;
            }
        }
    }
    return false;
};

ChannelList.prototype.setUsers = function(userNames,source) {
    if(userNames.length>0&&userNames[0]!='') {
        // check for added usernames
        for each(var user in userNames) {
            this.addUser(user,source);
        }
    }
    
    // check for removed users
    for(var user in this.users[source.channelType]) {
        if(!exactArraySearch(userNames,user,false)) {
            if(this.users[source.channelType][user].sources.onlySourceSet(source)) {
                this.removeUser(user,source.channelType);
            }
            else if(this.users[source.channelType][user].sources.isSourceSet(source)) {
                this.users[source.channelType][user].sources.unsetSource(source);
            }
        }
    }
};

ChannelList.prototype.addUser = function(user,source) {
    if(!this.users.hasOwnProperty(source.channelType)) {
        this.users[source.channelType] = new Object();
    }
    
    if(!this.userExists(user,source.channelType)) {
        this.users[source.channelType][user] = new User(user,source);
        return true;
    }
    else {
        this.users[source.channelType][user].sources.setSource(source);
        return false;
    }
};

ChannelList.prototype.removeUser = function(user,type) {
    emit(this, "userdeleted", this.users[type][user]);
    delete this.users[type][user];
};
ChannelList.prototype.userExists = function(userName,type) {
    return this.users.hasOwnProperty(type)&&this.users[type].hasOwnProperty(userName);
};

ChannelList.prototype.getChannelsByType = function(type) {
    return this.channels[type];
};

exports.ChannelList = ChannelList;

User.prototype.login = '';
User.prototype.requestID = 0;
User.prototype.sources = {};
User.prototype.type = '';
function User(name,source) {
    this.login = name;
    this.sources = new Sources(source);
    this.type = source.channelType;
}
exports.User = User;

/*
    Sources Object
*/

Sources.prototype.userSet = false;
Sources.prototype.credentialsSet = false;
Sources.prototype.usernames = [];
    
function Sources(source) {
    this.usernames = new Array();
    this.setSource(source);
}

Sources.prototype.setSource = function(source) {
        if(source.type==Source.TYPE_USERNAME) {
            if(!exactArraySearch(this.usernames,source.name,false))
                this.usernames.push(source.name);
        }
        else
            this[source.type+'Set'] = true;
};
Sources.prototype.unsetSource = function(source) {
        if(source.type==Source.TYPE_USERNAME) {
            if(exactArraySearch(this.usernames,source.name,false))
                this.usernames.splice(this.usernames.indexOf(source.name),1);
        }
        else
            this[source.type+'Set'] = false;
};

Sources.prototype.onlySourceSet = function(source) {
    var sourcePropertyName = source.type+'Set';

    // bail if the source isn't even set (only for bool sources)
    if(!this[sourcePropertyName]&&typeof this[sourcePropertyName] === "boolean") {
        return false;
    }
    
    var suc; 
    for(var s in this) {
        if(Array.isArray(this[s])&&this[s].length>0) {
            suc = this[s].every(function(item) {
                return item==source.name;
            });
            if(!suc) {
                return false;
            }
        }
        // since this is a for in iteration, functions are also iterated, which aren't sources...
        else if(typeof this[s] === "boolean"&&s!=sourcePropertyName&&this[s]) {
            return false;
        }
    }
    return true;
};
Sources.prototype.isSourceSet = function(source) {
    if(source.type==Source.TYPE_USERNAME) {
        for(var username in this.usernames) {
            if(username==source.name)
                return true;
        }
        return false;
    }
    return this[source.type+'Set'];
};


Sources.prototype.getFirstSourceType = function() {
    for(var s in this) {
        if(Array.isArray(this[s])&&this[s].length>0) {
            return Source.TYPE_USERNAME;
        }
        else if(s==Source.TYPE_USER+'Set') {
            return Source.TYPE_USER;
        }
        else if(s==Source.TYPE_CREDENTIALS+'Set') {
            return Source.TYPE_CREDENTIALS;
        }
    }
};

exports.Sources = Sources;

/*
    Source Object
    contains information about the origin of a channel and also additional information for the request
*/

Source.prototype.type = "";
Source.prototype.name = "";
Source.prototype.channelType = "";
//Source.prototype.login = "";
Source.TYPE_USENRAME = 'username';
Source.TYPE_CREDENTIALS = 'credentials';
Source.TYPE_USER = 'user';
function Source(type,channelName,channelType,options) {
    this.type = type;
    this.name = channelName;
    this.channelType = channelType;
    if(options) {
        for(var optionName in options) {
            this[optionName] = options[optionName];
        }
    }
}
exports.Source = Source;

/*
    UpdateQueue Object
    This is an expansion of the RequestQueue Object.
*/

function UpdateQueue() {
}
UpdateQueue.prototype = new RequestQueue();

// @override
UpdateQueue.prototype.addRequest = function(requestArgs,persistent,priorized) {
    persistent = persistent || false;
    priorized = priorized&&!persistent || false;
    if(!this.containsPriorized()&&priorized) {
        emit(this, "queuepriorized");
    }
    this.queue.push(mix(requestArgs,{'persist':persistent,'priorize':priorized,'id':++this.lastID}));
    return this.lastID;
};
// @override
UpdateQueue.prototype.getRequest = function(index) {
    if(this.containsPriorized()) {
        this.getFirstPriorized();
        if(!this.containsPriorized()) {
            emit(this, "allpriorizedloaded");
        }
    }
    else {
        this.getRequestByIndex(index);
    }
};

UpdateQueue.prototype.getFirstPriorized = function() {
    for(var i in this.queue) {
        if(this.queue[i].priorize) {
            this.getRequestByIndex(i);
            break;
        }
    }
};

UpdateQueue.prototype.getRequestByIndex = function(index) {
    console.log("getting "+this.queue[index].url);
    
    Request(this.queue[index]).get();
    if(this.queue[index].persist) {
        this.queue.push(this.queue.splice(index,1)[0]);
    }
    else {
        this.queue.splice(index,1);
    }
};

UpdateQueue.prototype.containsPriorized = function() {
    return this.queue.some(function(item) {
        return item.priorize;
    });
};

exports.UpdateQueue = UpdateQueue;
