/*
 * Channel list Objects
 */
 
// setup event handling 
var { emit } = require("sdk/event/core");
var { EventTarget } = require("sdk/event/target");

var { mix, obscure } = require('sdk/core/heritage');
var { URL } = require("sdk/url");
var { exactArraySearch } = require('./utils');
 
/*
    Channel Object
*/

// &u is the base URL of the channel
Channel.archiveURL = "%u/videos?kind=past_broadcasts";

Channel.getArchiveURL = function(baseURL) {
    if(typeof baseURL != "string") {
        baseURL = baseURL.toString();
    }
    return URL(Channel.archiveURL.replace("%u",baseURL));
}

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
//Channel.prototype.type = "";

Channel.QUEUED = 0;
Channel.FULL = 1;
Channel.UPDATING = 2;

// constructor
function Channel(status,source,channelObj) {
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();
    this.urls = new Array();
    this.image = new Array();
    this.sources = new Sources(source);
    if(status==Channel.FULL) {
		this.addRichInfo(channelObj);
    }
}

// methods
Channel.prototype.addRichInfo=function(channelRspObj) {
        this.status=Channel.FULL;
        
        /*
            we need to push array elements like beckham, so we don't modify the prototype.
            Actually constructing new Array object in the constructor adds a per-item array.
        */
        this.url.push(new URL(channelRspObj.channel_url));
        this.urls.push(channelRspObj.channel_url);
        this.name = channelRspObj.title;
        this.login = channelRspObj.login;
        this.image.push(channelRspObj.image_url_tiny);
        this.image.push(channelRspObj.image_url_medium);
};
Channel.prototype.toString = function() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
};

Channel.prototype.compareUrl = function(aUrl) {
    var url = new URL(aUrl);
    return this.url.some(function(vUrl) {
        return vUrl.host==url.host&&(this.live?vUrl.path:Channel.getArchiveURL(vUrl).path)==url.path.replace("/new","");
    });
};
Channel.prototype.getArchiveUrl = function(index) {
    return Channel.getArchiveURL(this.url[index]).toString();
};


exports.Channel = Channel;

/*
    ChannelList Object
*/
function ChannelList(options) {
    EventTarget.prototype.initialize(options);
    this.channels = new Object();
    this.channels = mix(this.channels,obscure({'length':0}));
    this.users = new Array();
}
ChannelList.prototype = Object.create(EventTarget.prototype);

ChannelList.prototype.channels = {};
ChannelList.prototype.users = [];

ChannelList.prototype.setChannels = function(source,channelNames,rich) {
    if(rich===undefined) {
        rich = false;
    }
    if(channelNames.length>0&&channelNames[0]!='') {
    
        // check for added channels
        for each(var channel in channelNames) {
            this.addChannel(channel,source,rich);
        }
    }
    
    // check for removed channels
    // We don't need to check the usernames here, since this is done right after the entry field gets changed
    for(var channel in this.channels) {
        if(!exactArraySearch(channelNames,channel,rich)) {
            if(this.channels[channel].sources.onlySourceSet(source)) {
                this.removeChannel(channel, true);
            }
            else if(this.channels[channel].sources.sourceSet(source)) {
                this.channels[channel].sources.unsetSource(source);
            }
        }
    }
};

ChannelList.prototype.addChannel = function(channel,source,rich) {
    var name = rich?channel.login:channel;
    var exists = this.channelExists(name);
    if(!exists&&!rich) {
        this.channels.length++;
        this.channels[name] = new Channel(Channel.QUEUED,source);
        emit(this, "completeChannelInfo", name, source);
    }
    else if(!exists) {
        this.channels.length++;
        this.channels[name] = new Channel(Channel.FULL,source,channel);
        emit(this, "channelAdded",this.channels[name]);
    }
    else if(this.channels[name].status == Channel.QUEUED&&rich) {
        this.channels[name].addRichInfo(channel);
        emit(this, "channelAdded",this.channels[name]);
    }
    else
        this.channels[name].sources.setSource(source);
};

ChannelList.prototype.removeChannel = function(channel,del) {
    var channelObj = this.channels[channel];
    if(channelObj.live) {
        emit(this, "channelOffline", channelObj);
        
        // set the channel offline, so liveStatus works properly
        channelObj.live = false;
        
        if(!this.liveStatus()) {
            emit(this, "allChannelsOffline");
        }
    }
    if(del) {
        if(channelObj.status!=Channel.QUEUED)
            emit(this, "channelDeleted", channel);
        delete this.channels[channel];
    }
};
ChannelList.prototype.setChannelLive = function(channel) {
    var channelObj = this.channels[channel];
    channelObj.live = true;
    
    emit(this, "channelLive", channelObj);
};

ChannelList.prototype.channelExists = function(channelName) {
    return this.channels.hasOwnProperty(channelName)||channelName=='length';
};

ChannelList.prototype.liveStatus = function() {
    if(this.channels.length>0) {
        for(channel in this.channels) {
            if(this.channels[channel].live)
                return true;
        }
    }
    return false;
}

exports.ChannelList = ChannelList;

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
            suc = this[source].every(function(item) {
                return item==source.name;
            });
            if(!suc) {
                return false;
            }
        }
        // since this is a for in iteration, functions are also iterated, which aren't sources...
        else if(typeof this[s] !== "function"&&s!=sourcePropertyName&&this[s]) {
            return false;
        }
    }
    return true;
};
Sources.prototype.isSourceSet = function(source) {
    if(source.type==Source.TYPE_USERNAME) {
        for(username of this.usernames) {
            if(username==source.name)
                return true;
        }
        return false;
    }
    return this[source.type+'Set'];
};


Sources.prototype.getFirstSourceObject = function(c) {
    for(var s in this) {
        if(Array.isArray(this[s])&&this[s].length>0) {
            return new Source(Source.TYPE_USERNAME,this[s][0]);
        }
        else if(s==Source.TYPE_USER+'Set') {
            return new Source(Source.TYPE_USER,c);
        }
        else if(s==Source.TYPE_CREDENTIALS+'Set') {
            return new Source(Source.TYPE_CREDENTIALS,c);
        }
    }
}

exports.Sources = Sources;

/*
    Source Object
    contains information about the origin of a channel and also additional information for the request
*/

Source.prototype.type = "";
Source.prototype.name = "";
Source.TYPE_USENRAME = 'username';
Source.TYPE_CREDENTIALS = 'credentials';
Source.TYPE_USER = 'user';
function Source(type,channelName,options) {
    this.type = type;
    this.name = channelName;
    if(options) {
        for(option in options) {
            this[option] = options[option];
        }
    }
}
exports.Source = Source;
