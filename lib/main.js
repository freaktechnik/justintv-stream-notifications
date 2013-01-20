/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */


var Notifications = require("notifications");
var timer = require("timers");
var tabs = require("tabs");
var Request = require("request").Request;
var simplePrefs = require("simple-prefs");
var prefs = simplePrefs.prefs;
var passwords = require("passwords");
var self = require("self");
var _ = require("l10n").get;

var livePanel;
var panelButton;

var data = {};
data.intId;
data.channels = [];
data.users = [];

exports.main = function() {
    if(prefs.updateInterval>0)
        data.intId = timer.setInterval(this.query,1000*prefs.updateInterval);
    else data.intId = false;
	this.setChannels('user',prefs.channelList.split(','),false);
    this.addUserFavorites();
    this.getLoginName();
    tabs.on('ready', function onOpen(tab) {
        exports.checkTab(tab);
    });
    tabs.on('close', function(tab) {
        exports.uncheckTab(tab);
    });
    tabs.on('activate', function(tab) {
        exports.checkTab(tab);
    });
    tabs.on('deactivate', function(tab) {
        exports.uncheckTab(tab);
    });
    simplePrefs.on('updateInterval',function() {
        if(data.intId)
            timer.clearInterval(data.intId);
        if(prefs.updateInterval>0)
            data.intId = timer.setInterval(exports.query,1000*prefs.updateInterval);
        else data.intId = false;
    });
    simplePrefs.on('channelList',function() {
        exports.setChannels({'name':'user','type':'user'},prefs.channelList.split(','),false);
    });
    simplePrefs.on('usernameList',function() {
        exports.addUserFavorites();
    });
    simplePrefs.on('autoUsername',function() {
        exports.getLoginName();
    });
    
    // panel init
    var panelWidth = 212;
    livePanel = require("panel").Panel({
      width: panelWidth+12,
      contentURL: self.data.url("live-panel.html"),
      contentScriptOptions: {'minWidth':panelWidth}
    });
    panelButton = require("widget").Widget({
      label: _("live_widget_label"),
      tooltip: _("live_panel_label_offline"),
      id: "live-channels",
      contentURL: self.data.url("panel_icon_empty.png"),
      panel: livePanel
    });
    livePanel.port.on("openTab",function(url) {
        for(var channel in data.channels) {
            if(exports.compareUrl(url,channel)) {
                exports.openTab(channel);
            }
        }
    });
	livePanel.port.on("resizePanel",function(dimensions) {
        livePanel.resize(dimensions[0],dimensions[1]);
    });
    livePanel.port.on("refresh",function() {
        exports.query();
    });
};

/*
 * settings handler
 */

exports.setChannels = function(source,channelNames,rich) {
    if(rich===undefined) {
        rich = false;
    }
    if(channelNames.length>0&&channelNames[0]!='') {
        // check for added channels
        var name;
        for each(var channel in channelNames) {
            name = rich?channel.login:channel;
            if(!this.channelExists(name))
                data.channels[name] = new Channel('queued',source);
            if(!rich)
				exports.checkRateLimit({'name':source.name,'type':source.type,'channel':channel},exports.getChannelDetails);
			else
				this.addChannel(channel,source);
        }
    }
    
    // check for removed channels
    // We don't need to check the usernames here, since this is done right after the entry field gets changed
    for(var channel in data.channels) {
        if(!this.exactArraySearch(channelNames,channel,rich)&&source.type!='username') {
            if(data.channels[channel].sources.onlySourceSet(source.type)) {
                this.removeChannel(channel);
            }
            else if(data.channels[channel].sources[source.type+'Set']) {
                data.channels[channel].sources[source.type+'Set'] = false;
            }
        }
    }
};

exports.addChannel = function(channelRspObj,source) {
    if(this.channelExists(channelRspObj.login)) {
        if(data.channels[channelRspObj.login].status=='queued')
            data.channels[channelRspObj.login].addRichInfo(channelRspObj);
        else
            data.channels[channelRspObj.login].sources.setSource(source);
    }
};

exports.removeChannel = function(channel) {
    if(data.channels[channel].isLive) {
        livePanel.port.emit('remove',data.channels[channel].names[0]);
            
        if(panelButton.contentURL == self.data.url("panel_icon.png")&&!this.liveStatus()) {
            panelButton.contentURL = self.data.url("panel_icon_empty.png");
            panelButton.tooltip = _("live_panel_label_offline");
        }
    }
    delete data.channels[channel];
};

exports.updateFavorites = function() {
    exports.addUserFavorites();
    exports.getLoginName();
};

exports.addUserFavorites = function() {
    data.users = [];
    if(prefs.usernameList!='') {
        var usernames = prefs.usernameList.split(',');
        for(var username of usernames) {
           exports.checkRateLimit({'name':username,'type':'username'},exports.getUserFavorites);
           data.users.push(username);
        }
        
    }
    
    // we can directly check for removed channels here, since
    // possibly deferred channels of a removed username won't get added
    // in any case.
    for(var channel in data.channels) {
        for(var username in data.channels[channel].sources.usernames) {
            if(!this.exactArraySearch(data.users,data.channels[channel].sources.usernames[username],false)||data.users.length==0) {
                if(data.channels[channel].sources.onlySourceSet(data.channels[channel].sources.usernames[username])||data.users.length==0) {
                    this.removeChannel(channel);
                }
                else {
                    data.channels[channel].sources.usernames.splice(username,1);
                }
            }
        }
    }
};

exports.getLoginName = function() {
    if(prefs.autoUsername) {
         passwords.search({
            url: 'http://www.justin.tv',
            onComplete: function(credentials) {
                credentials.forEach(function(credential) {
                    exports.checkRateLimit({'name':credential.username,'type':'credentials'},exports.getUserFavorites);
                });
            }
         });
         passwords.search({
            url: 'http://www.twitch.tv',
            onComplete: function(credentials) {
                credentials.forEach(function(credential) {
                    exports.checkRateLimit({'name':credential.username,'type':'credentials'},exports.getUserFavorites);
                });
            }
         });
    }
    else {
        for(var channel in data.channels) {
            if(data.channels[channel].sources.onlySourceSet('credentials')) {
				this.removeChannel(channel);
			}
            else if(data.channels[channel].sources.credentialsSet)
                data.channels[channel].sources.credentialsSet = false;
        }
    }
};

exports.getUserFavorites = function(source) {
    var favoritesRequest = Request({
        url: 'http://api.justin.tv/api/user/favorites/'+source.name+'.json',
        onComplete: function (response) {
            if(exports.exactArraySearch(data.users,source.name,false))
                exports.extractChannelsFromFavorites(source,response.json);
        }
    });
    favoritesRequest.get();
};

exports.getChannelDetails = function(source) {
    var detailRequest = Request({
        url: 'http://api.justin.tv/api/channel/show/'+source.channel+'.json',
        onComplete: function (response) {
            if(!response.json.error&&exports.channelExists(source.channel))  {
                if(data.channels[source.channel].status=='queued') {
                    exports.addChannel(response.json,source);
                }
            }
        }
    });
    detailRequest.get();
};

exports.extractChannelsFromFavorites = function(source,response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(channel);
        });
        this.setChannels(source,channelNames,true);
    }
};

exports.channelExists = function(channelName) {
    for(var channel in data.channels) {
        if(channelName==channel)
            return true;
    }
    return false;
};

exports.exactArraySearch = function(array, string, rich) {
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};

/*
 * live status queries
 */

exports.query = function() {
    for(var channel in data.channels) {
        if(data.channels[channel].status=='full')
            exports.checkRateLimit(channel,exports.createQuery);    
    }
};

exports.checkRateLimit = function(channel,completeFunction) {
    var rateRequest = Request({
        url: 'http://api.justin.tv/api/application/rate_limit_status.json?t='+new Date().getTime(),
        onComplete: function (response) {
            if(response!=null&&!response.json.rate_limited)
                completeFunction(channel);
        }
    });
    rateRequest.get();
};

exports.createQuery = function(channel) {
    var liveStatusRequest = Request({
        url: 'http://api.justin.tv/api/stream/list.json?channel='+channel,
        onComplete: function (response) {
            exports.checkStatus(response,channel);
        }
    });
    liveStatusRequest.get();
};

exports.checkStatus = function(results,channel) {
    try {
        var result = results.json;
        if(result.length>0&&!data.channels[channel].isLive) {
            data.channels[channel].isLive = true;
            
			if(!data.channels[channel].mute&&prefs.onlineNotification)
				this.sendNotification(result[0].title,result[0].channel.image_url_medium,channel,true);
                
			data.channels[channel].image[0] = result[0].channel.image_url_tiny;
            data.channels[channel].image[1] = result[0].channel.image_url_medium;
			data.channels[channel].title = result[0].title;
            
            livePanel.port.emit('add',data.channels[channel]);
            
            if(panelButton.contentURL == self.data.url("panel_icon_empty.png")) {
                panelButton.contentURL = self.data.url("panel_icon.png");
                panelButton.tooltip = _("live_widget_label");
            }
        }
        else if(result.length>0&&data.channels[channel].isLive) {
            if(data.channels[channel].title!=result[0].title) {
                data.channels[channel].title = result[0].title;
                data.channels[channel].image[0] = result[0].channel.image_url_tiny;
                data.channels[channel].image[1] = result[0].channel.image_url_medium;
                
                if(!data.channels[channel].mute&&prefs.titleChangeNotification)
                    this.sendNotification(result[0].title,result[0].channel.image_url_medium,channel,true);
            }
        }
        else if(!result.length&&data.channels[channel].isLive) {
            this.onChannelRemove(channel);
        
            data.channels[channel].isLive = false;
            
            if(!data.channels[channel].mute&&prefs.offlineNotification)
				this.sendNotification( data.channels[channel].title, data.channels[channel].image[1],channel,false);
        }
    }
    catch(e) {
    }
};

exports.sendNotification = function(caption,icon,channel,isLive) {
    try {
        Notifications.notify({
            title: (isLive ? _("onlineNotification",data.channels[channel].getPrimaryName()) : _("offlineNotification",data.channels[channel].getPrimaryName())),
            text: caption,
            iconURL: icon,
            onClick: function() {
                exports.openTab(channel);
            }
        });
    }
    catch(e) {}
};

/*
 * Tab handlers
 */

exports.openTab = function(channel) {    
    for each(var tab in tabs) {
        if(this.compareUrl(tab.url,channel)) {
            tab.activate();
            return true;
        }
    }
    tabs.open(data.channels[channel].getUrl(1));
};


exports.checkTab = function(tab) {
    for(var channel in data.channels) {
        if(this.compareUrl(tab.url,channel)) {
            this.muteChannel(channel);
            data.channels[channel].tabIndex = tab.index;
        }
    }
    
    // if the location of a tab changes away from a stream page
    for(var channel in data.channels) {
        if(tab.index==data.channels[channel].tabIndex&&!this.compareUrl(tab.url,channel)) {
            this.unmuteChannel(channel);
            data.channels[channel].tabIndex = -1;
        }
    }
};

exports.compareUrl = function(aUrl,channel) {
    return data.channels[channel].url.some(function(value) {
        return 'http://'+value==aUrl||'http://www.'+value==aUrl;
    });
};

exports.uncheckTab = function(tab) {
    for(var channel in data.channels) {
        if(this.compareUrl(tab.url,channel)) {
            this.unmuteChannel(channel);
            data.channels[channel].tabIndex = -1;
        }
    }
};

exports.muteChannel = function(channel) {
    try{
        data.channels[channel].mute = true;
    }
    catch(e) {
        // empty because there is nothing to fix there.
    }
};

exports.unmuteChannel = function(channel) {
    try {
        data.channels[channel].mute = false;
    }
    catch(e) {
        // empty because there is nothing to fix there.
    }
};

exports.liveStatus = function() {
    for(channel of data.channels) {
        if(channel.isLive)
            return true;
    }
    return false;
}


/*
    Channel Object
*/

// properties
Channel.prototype.isLive=false;
Channel.prototype.mute=false;
Channel.prototype.title='';
Channel.prototype.tabIndex=-1;
Channel.prototype.url=[];
Channel.prototype.names=[];
Channel.prototype.sources=null;
Channel.prototype.image=[];
Channel.prototype.status='queued';

// constructor
function Channel(status,source,channelObj) {
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();
    this.names = new Array();
    this.image = new Array();
    this.sources = new Sources(source);
    if(status=='full') {
		this.addRichInfo(channelObj);
    }
}

// methods
Channel.prototype.addRichInfo=function(channelRspObj) {
        this.status='full';
        
        /*
            we need to push array elements like beckham, so we don't modify the prototype.
            Actually constructing new Array object in the constructor adds a per-item array.
        */
        this.url.push(channelRspObj.channel_url.replace("http://",""));
        this.names.push(channelRspObj.title);
        this.names.push(channelRspObj.login);
        this.image.push(channelRspObj.image_url_tiny);
        this.image.push(channelRspObj.image_url_medium);
};
Channel.prototype.getPrimaryName = function() {
    try {
        return this.names[0].charAt(0).toUpperCase() + this.names[0].slice(1);
    }
    catch(e) {
        return '';
    }
};
Channel.prototype.getUrl = function(index) {
    if(index<=this.url.length)
        return 'http://'+this.url[index-1];
};


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
        if(source.type=='username')
            this.usernames.push(source.name);
        else
            this[source.type+'Set'] = true;
};

Sources.prototype.onlySourceSet = function(sourceName) {
    var sourcePropertyName = sourceName+'Set';

    // bail if the source isn't even set (only for bool sources)
    if(!this[sourcePropertyName]&&typeof this[sourcePropertyName] === "boolean")
        return false;
    
    var suc; 
    for(var source in this) {
        if(Array.isArray(this[source])) {
            suc = this[source].every(function(item) {
                return item==sourceName;
            });
            if(!suc)
                return false;
        }
        // since this is a for in iteration, functions are also iterated, which aren't sources...
        else if(source!=sourcePropertyName&&this[source]&&typeof this[source] !== "function")
            return false;
    }
    return true;
};