/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 * 
 * Known bugs:
 * - Refresh button off the panel on elementary OS with elementary OS theme (aka. Fixed refreshbutton placement for some themes)
 * - Outputs some debug info to the dev console
 * - channels with fetched channeldata probably don't get deleted
 *
 * Planned features:
 * - show duration a stream is online in panel (?)
 * - update favorites of users in runtime
 * - detect embedded streams in any website?
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
        var prototype, name;
        for each(var channel in channelNames) {
            if(!rich) {
				exports.checkRateLimit({'name':source.name,'type':source.type,'channel':channel},exports.getChannelDetails);
			}
			else {
				this.addChannel(channel,source);
			}
        }
    }
    // check for removed channels
    for(var channel in data.channels) {
        if(!this.exactArraySearch(channelNames,channel,rich)) {
            if(this.onlySourceSet(source.type,channel)) {
                console.log("removed "+channel);
                this.onChannelRemove(channel);
                delete data.channels[channel];
            }
            else if(data.channels[channel].sources[source.type+'Set']&&source.type!='username') {
                data.channels[channel].sources[source.type+'Set'] = false;
                console.log("removed source "+source.type+" from "+channel);
            }
            else if(source.type=='username') {
                for(var username in data.channels[channel].sources.usernames) {
                    if(!this.exactArraySearch(data.users,data.channels[channel].sources.usernames[username],false))
                        data.channels[channel].sources.usernames.splice(username,1);
                }
            }
        }
        else if(source.type=='username') {
            for(var username in data.channels[channel].sources.usernames) {
                if(!this.exactArraySearch(data.users,data.channels[channel].sources.usernames[username],false)) {
                    if(this.onlySourceSet(data.channels[channel].sources.usernames[username],channel)) {
                        this.onChannelRemove(channel);
                        delete data.channels[channel];
                    }
                    else
                        data.channels[channel].sources.usernames.splice(username,1);
                }
            }
        }
        else {
            console.log("skipped "+channel);
        }
    }
};

exports.addChannel = function(channel,source) {
    console.log(channel.title+" "+source.name);
	if(!this.channelExists(channel.login)) {
		prototype = {'isLive':false,'mute':false,'tabIndex':-1,'url':[],'names':[],'sources':{'userSet':false,'credentialsSet':false,'usernames':[]},'image':[]};
		prototype.url.push(channel.channel_url.replace("http://",""));
		if(source.type=='username')
			prototype.sources.usernames.push(channel.login);
		else
			prototype.sources[source.type+'Set'] = true;
		prototype.names.push(channel.title);
		prototype.names.push(channel.login);
		prototype.image.push(channel.image_url_tiny);
        prototype.image.push(channel.image_url_medium);
		prototype.title = "";
		data.channels[channel.login] = prototype;
	}
	else if(source.type=='username')
		data.channels[channel.login].sources.usernames.push(source.name);
	else
		data.channels[channel.login].sources[source.type+'Set'] = true;
};

exports.onChannelRemove = function(channel) {
    if(data.channels[channel].isLive) {
        livePanel.port.emit('remove',data.channels[channel].names[0]);
            
        if(panelButton.contentURL == self.data.url("panel_icon.png")&&!this.liveStatus()) {
            panelButton.contentURL = self.data.url("panel_icon_empty.png");
            panelButton.tooltip = _("live_panel_label_offline");
        }
    }
};

exports.updateFavoties = function() {
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
    else {
        for(var channel in data.channels) {
            for(var username in data.channels[channel].sources.usernames) {
                if(this.onlySourceSet(data.channels[channel].sources.usernames[username],channel)) {
                    this.onChannelRemove(channel);
                    delete data.channels[channel];
                }
                else
                    data.channels[channel].sources.usernames.splice(username,1);
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
            if(this.onlySourceSet('credentials',channel)) {
				this.onChannelRemove(channel);
                delete data.channels[channel];
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
            exports.extractChannelsFromFavorites(source,response.json);
        }
    });
    favoritesRequest.get();
};

exports.getChannelDetails = function(source) {
    var detailRequest = Request({
        url: 'http://api.justin.tv/api/channel/show/'+source.channel+'.json',
        onComplete: function (response) {
            if(!response.json.error)
                exports.addChannel(response.json,source);
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
        if(string==name) {
            return true;
        }
    }
    return false;
};

exports.onlySourceSet = function(sourceName,channel) {
    var suc,sourcePropertyName = sourceName+'Set';
    for(var source in data.channels[channel].sources) {
        if(Array.isArray(data.channels[channel].sources[source])) {
            suc = data.channels[channel].sources[source].every(function(item) {
                if(item!=sourceName)
                    return false;
                return true;
            });
            if(!suc)
                return false;
        }
        else if(source!=sourcePropertyName&&data.channels[channel].sources[source]&&typeof data.channels[channel].sources[source]=='boolean')
            return false;
    }
    return true;
};

/*
 * live status queries
 */

exports.query = function() {
    for(var channel in data.channels) {
        exports.checkRateLimit(channel,exports.createQuery);    
    }
};

exports.checkRateLimit = function(channel,completeFunction) {
    var rateRequest = Request({
        url: 'http://api.justin.tv/api/application/rate_limit_status.json?t='+new Date().getTime(),
        onComplete: function (response) {
            if(!response.json.rate_limited)
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
        console.log("trying to modify "+channel);
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
        console.log(e);
    }
};

exports.sendNotification = function(caption,icon,channel,isLive) {
    try {
        Notifications.notify({
            title: (isLive ? _("onlineNotification",exports.getPrimaryName(channel)) : _("offlineNotification",exports.getPrimaryName(channel))),
            text: caption,
            iconURL: icon,
            onClick: function() {
                exports.openTab(channel);
            }
        });
    }
    catch(e) {}
};

exports.getPrimaryName = function(channel) {
    try {
        return data.channels[channel].names[0].charAt(0).toUpperCase() + data.channels[channel].names[0].slice(1);
    }
    catch(e) {
        return '';
    }
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
    tabs.open(this.getFirstUrl(channel));
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

exports.getFirstUrl = function(channel) {
    return 'http://'+data.channels[channel].url[0];
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