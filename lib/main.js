/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

var Notifications = require("sdk/notifications");
var timer = require("sdk/timers");
var tabs = require("sdk/tabs");
var Request = require("sdk/request").Request;
var simplePrefs = require("sdk/simple-prefs");
var prefs = simplePrefs.prefs;
var passwords = require("sdk/passwords");
var self = require("sdk/self");
var _ = require("sdk/l10n").get;
var ss = require("sdk/simple-storage");
var { URL } = require("sdk/url");
var { Channel, ChannelList, Sources, Source } = require('./channellist');
var { exactArraySearch } = require('./utils');

var livePanel;
var panelWidget, panelButton;
var intId;
var data = ss.storage;
// this is secret
var oauthKey = 'nUiO8uME4MWnjNp9qhmpw';

var _testing = false;

exports.main = function() {
    if(self.loadReason=='install') {
        tabs.open({url:"http://jtvn.humanoids.be/first-run.html",inBackground:true});
    }
    else if(self.loadReason=='upgrade'&&prefs.updateTab) {
        tabs.open({url:"http://jtvn.humanoids.be/changes-"+self.version+".html",inBackground:true});
    }
    
    // panel init

    var panelWidth = 212;
    livePanel = require("sdk/panel").Panel({
      width: panelWidth+12,
      contentURL: self.data.url("live-panel.html"),
      contentScriptOptions: {'minWidth':panelWidth}
    });
    
    // init neutral (not on channels relying) listeners here
    
    livePanel.port.on("resizePanel",function(dimensions) {
        livePanel.resize(dimensions[0],dimensions[1]);
        livePanel.port.emit("resizeDone");
    });    
    
    this.setPanelAccess(prefs.panelAccess,true);
    
    // import add-on settings on first run/enable
    
    if(self.loadReason=='install'||self.loadReason=='enable') {
        this.init();
        this.attach();
    }
    else if(data.quotaDisabled||data==={}) {
        // reset data

        data = {};
        this.init();
        this.attach();
    }
    else {
        livePanel.port.on("loaded",function() {
            data.__proto__ = ChannelList.prototype;
            var channelObj;
            for(var channel in data.channels) {
                channelObj = data.channels[channel]
                // reset the Object types
                channelObj.urls.forEach(function(url,index) {
                    // we need to redefine the URL objects, sadly.
                    channelObj.url[index] = new URL(url);
                });
                channelObj.__proto__ = Channel.prototype;
                channelObj.sources.__proto__ = Sources.prototype;
                
                if(channelObj.status == Channel.UPDATING)
                    channelObj.status = Channel.FULL;
                else if(channelObj.status == Channel.QUEUED)
                    exports.checkRateLimit(channelObj.getFirstSourceObject(),exports.getChannelDetails,false);
                
                livePanel.port.emit("add",channelObj);
                
                // display channels saved as live
                if(channelObj.live)
                    data.setChannelLive(channel);
            }
            
            // do this afterwards; is safer.
            exports.updateFavorites();
            
            // update the channel states, so possibly no-longer-live channels get hidden.
            exports.query();
            exports.attach();
        });
    }
    
    if(_testing) {
        data = {};
        this.init();
    }
    
    ss.on("OverQuota", function() {
        // wipe storage
        data.channels = [];
        data.users = [];
        data.quotaDisabled = true;
        
        // set up local stuff

        data = {};
        this.init();
        this.attachChannelList();
    });
};

exports.init = function() {
    data = new ChannelList();
    data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER),getUsernames(prefs.channelList),false);
    this.updateFavorites();
};

exports.attach = function() {
    if(prefs.updateInterval>0)
        intId = timer.setInterval(this.query,1000*prefs.updateInterval);
    else intId = false;
    
    
    simplePrefs.on('panelAccess', function() {
        exports.setPanelAccess(prefs.panelAccess);
    });
    
    // set up listeners
    
    tabs.on('ready', function (tab) {
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
        if(intId)
            timer.clearInterval(intId);
        if(prefs.updateInterval>0)
            intId = timer.setInterval(exports.query,1000*prefs.updateInterval);
        else intId = false;
    });
    simplePrefs.on('channelList',function() {
        data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER),getUsernames(prefs.channelList),false);
    });
    simplePrefs.on('usernameList',function() {
        exports.addUserFavorites();
    });
    simplePrefs.on('autoUsername',function() {
        exports.getLoginName();
    });
    
    livePanel.port.on("openTab",function(channel) {
        exports.openTab(channel);
    });
    livePanel.port.on("refresh",function() {
        exports.query();
    });
    livePanel.port.on("log",function(e) {
        console.log(e);
    });
    
    this.attachChannelList();
};
exports.attachChannelList = function() {
    data.on('allChannelsOffline',function() {
        if(prefs.panelAccess == 0 && panelWidget.contentURL == self.data.url("panel_icon.png")) {
            panelWidget.contentURL = self.data.url("panel_icon_empty.png");
            panelWidget.tooltip = _("live_panel_label_offline");
        }
        else if(prefs.panelAccess == 1 && panelButton.image == self.data.url("panel_icon.png")) {
            panelButton.image = self.data.url("panel_icon_empty.png");
            panelButton.tooltiptext = _("live_panel_label_offline");
        }
    });
    data.on('completeChannelInfo',function(name,source) {
        exports.checkRateLimit(channelObj.getFirstSourceObject(),exports.getChannelDetails,false);
    });
    data.on('channelAdded',function(channelObj) {
        livePanel.port.emit("add",channelObj);
    });
    data.on('channelOfffline',function(channelObj) {
        livePanel.port.emit('move',channelObj);
        
        if(!channelObj.mute&&prefs.offlineNotification)
				this.sendNotification( channelObj.title, channelObj.image[1],channel,false);
    });
    data.on('channelDeleted',function(channel) {
        livePanel.port.emit("remove",channel);
    });
    data.on('channelLive',function(channelObj) {
        if(!channelObj.mute&&prefs.onlineNotification)
            exports.sendNotification(channelObj.title,channelObj.image[1],channel,true);
            
        livePanel.port.emit('move',channelObj);
        
        if(prefs.panelAccess == 0 && panelWidget.contentURL == self.data.url("panel_icon_empty.png")) {
            panelWidget.contentURL = self.data.url("panel_icon.png");
            panelWidget.tooltip = _("live_widget_label");
        }
        else if(prefs.panelAccess == 1 && panelButton.image == self.data.url("panel_icon_empty.png")) {
            panelButton.image = self.data.url("panel_icon.png");
            panelButton.tooltiptext = _("live_widget_label");
        }
    });
};

exports.setPanelAccess = function(type,ignoreLive) {
    var live = false;
    if(!ignoreLive)
        live = data.liveStatus();
    
    if(type==0) {
        if(panelButton) {
            panelButton.panel = null;
            panelButton.destroy();
        }
        panelWidget = require("sdk/widget").Widget({
          label: _("live_widget_label"),
          tooltip: live?_("live_widget_label"):_("live_panel_label_offline"),
          id: "live-channels",
          contentURL: live?self.data.url("panel_icon.png"):self.data.url("panel_icon_empty.png"),
          panel: livePanel
        });
    }
    else {
        if(panelWidget) {
            panelWidget.panel = null;
            panelWidget.destroy();
        }
        panelButton = require("toolbarbutton").ToolbarButton({
            id: "live-channels-button",
            label: _("live_widget_label"),
            tooltiptext: live?_("live_widget_label"):_("live_panel_label_offline"),
            toolbarID: "nav-bar",
            image: live?self.data.url("panel_icon.png"):self.data.url("panel_icon_empty.png"),
            panel: livePanel
        });
    }
}

/*
 * settings handler
 */

exports.updateFavorites = function() {
    exports.addUserFavorites();
    exports.getLoginName();
};

exports.addUserFavorites = function() {
    data.users = [];
    if(prefs.usernameList!='') {
        var usernames = getUsernames(prefs.usernameList);
        for(var username of usernames) {
           exports.checkRateLimit(new Source(Source.TYPE_USERNAME,username,{'page':0}),exports.getUserFavorites,false);
           data.users.push(username);
        }
        
    }
    
    // we can directly check for removed channels here, since
    // possibly deferred channels of a removed username won't get added
    // in any case.
    // however we are missing out on channels removed from a users favs.
    for(var channel in data.channels) {
        for(var username in data.channels[channel].sources.usernames) {
            if(!exactArraySearch(data.users,data.channels[channel].sources.usernames[username],false)||data.users.length==0) {
                if(data.channels[channel].sources.onlySourceSet(new Source(Source.TYPE_USERNAME,username))||data.users.length==0) {
                    this.removeChannel(channel, true);
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
                    exports.checkRateLimit(new Source(Source.TYPE_CREDENTIALS,credential.username,{'page':0}),exports.getUserFavorites,false);
                });
            }
         });
         passwords.search({
            url: 'http://www.twitch.tv',
            onComplete: function(credentials) {
                credentials.forEach(function(credential) {
                    exports.checkRateLimit(new Source(Source.TYPE_CREDENTIALS,credential.username,{'page':0}),exports.getUserFavorites,false);
                });
            }
         });
    }
    else {
        for(var channel in data.channels) {
            if(data.channels[channel].sources.onlySourceSet(new Source(Source.TYPE_CREDENTIALS,Source.TYPE_CREDENTIALS)))
				this.removeChannel(channel, true);
            else
                data.channels[channel].sources.credentialsSet = false;
        }
    }
};

exports.getUserFavorites = function(source,ignoreNull) {
    var favoritesRequest = Request({
        url: 'https://api.justin.tv/api/user/favorites/'+source.name+'.json?limit=100&offset='+source.page*100,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function(response) {
            console.log("user favorites got");
            if(exports.checkResponse(response)) {
                console.log("user favorites valid");
                if(exactArraySearch(data.users,source.name,false)||source.type==Source.TYPE_CREDENTIALS)
                    exports.extractChannelsFromFavorites(source,response.json);
            }
            else if(!ignoreNull&&exports.noFatalError(response))
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber(),source,exports.getUserFavorites,ignoreNull);
        }
    });
    console.log("getting user favorites");
    favoritesRequest.get();
};

exports.getChannelDetails = function(source,ignoreNull) {
    var detailRequest = Request({
        url: 'https://api.justin.tv/api/channel/show/'+source.name+'.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel details got");
            if(exports.checkResponse(response))  {
                console.log("Channel detail valid");
                if(!response.json.error && data.channelExists(source.name) && data.channels[source.name].status==Channel.QUEUED)
                    data.addChannel(response.json,source,true);
            }
            else if(!ignoreNull&&exports.noFatalError(response)) {
                console.log("retrying getting channel details");
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber(),source,exports.getChannelDetails,ignoreNull);
            }
        }
    });
    console.log("getting channel details");
    detailRequest.get();
};

exports.extractChannelsFromFavorites = function(source,response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(channel);
        });
        data.setChannels(source,channelNames,true);
        
        if(response.length==100) {
            source.page++;
            exports.checkRateLimit(source,exports.getUserFavorites,false);
        }
    }
};

// returns a random number between 100 and 115
function randomDelayNumber() {
    return 100+Math.floor(Math.random() * 16);
}

function getUsernames(string) {
    return string.replace(" ","").split(','); // remove spaces andsplit by commas
};

/*
 * live status queries
 */

exports.query = function() {
    for(var channel in data.channels) {
        if(data.channels[channel].status==Channel.FULL) {
            data.channels[channel].status = Channel.UPDATING;
            exports.checkRateLimit(channel,exports.createQuery,true);
        }
    }
};

exports.checkRateLimit = function(channel,completeFunction,ignoreNull) {
    var rateRequest = Request({
        url: 'https://api.justin.tv/api/application/rate_limit_status.json?t='+new Date().getTime(),
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("ratelimit got");
            if(exports.checkResponse(response)&&!response.json.rate_limited) {
                console.log("ratelimit response was valid");
                completeFunction(channel,ignoreNull);
            }
            else if(!ignoreNull&&exports.noFatalError(response)) {
                console.log("refetching ratelimit");
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber,channel,completeFunction,ignoreNull);
            }
            else if(data.channelExists(channel)&&data.channels[channel].status==Channel.UPDATING)
                data.channels[channel].status = Channel.FULL;
        }
    });
    console.log("getting reate limit");
    rateRequest.get();
};

exports.createQuery = function(channel,ignoreNull) {
    var liveStatusRequest = Request({
        url: 'https://api.justin.tv/api/stream/list.json?channel='+channel,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel updated");
            if(exports.checkResponse(response))
                exports.checkStatus(response.json,channel);
            else if(!ignoreNull&&exports.noFatalError(response))
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber,channel,exports.createQuery,ignoreNull);
            else
                data.channels[channel].status = Channel.FULL;
        }
    });
    console.log("updating channel");
    liveStatusRequest.get();
};

exports.checkResponse = function(response) {
    return response!=null&&response.status==200&&!response.json.error;
};

exports.noFatalError = function(response) {
    var json = response.json;
    if(json&&json.error) {
        console.log("json error:"+json.error);
        return json.error!="couldn't find user"&&json.error!="couldn't find channel";
    }
    console.log("Status code:"+response.status);
    return (response.status<400||response.status>=500)&&response.status!=0;
};

exports.checkStatus = function(result,channel) {
    try {
        var channelObj = data.channels[channel];
        channelObj.status = Channel.FULL;
        if(result.length>0&&!channelObj.live) {
            
            channelObj.image[0] = result[0].channel.image_url_tiny;
            channelObj.image[1] = result[0].channel.image_url_medium;
            channelObj.title = result[0].title;
            
			data.setChannelLive(channel);
        }
        else if(result.length>0&&channelObj.live&&channelObj.title!=result[0].title) {
            channelObj.title = result[0].title;
            channelObj.image[0] = result[0].channel.image_url_tiny;
            channelObj.image[1] = result[0].channel.image_url_medium;
            
            if(!channelObj.mute&&prefs.titleChangeNotification)
                this.sendNotification(channelObj.title,channelObj.channel.image_url_medium,channel,true);
        }
        else if(!result.length&&data.channels[channel].live) {
            data.removeChannel(channel,false);
        }
    }
    catch(e) {}
};

exports.sendNotification = function(caption,icon,channel,live) {
    try {
        Notifications.notify({
            title: (live ? _("onlineNotification",data.channels[channel].toString()) : _("offlineNotification",data.channels[channel].toString())),
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
        if(data.channels[channel].compareUrl(tab.url,channel)) {
            tab.activate();
            return;
        }
    }
    tabs.open(data.channels[channel].live?data.channels[channel].url[0].toString():data.channels[channel].getArchiveUrl(0));
};


exports.checkTab = function(tab) {
    if(tab.index == tabs.activeTab.index) {
        for(var channel in data.channels) {
            if(data.channels[channel].compareUrl(tab.url,channel)) {
                data.channels[channel].mute = true;
                data.channels[channel].tabIndex = tab.index;
            }
        }
    }
    
    // if the location of a tab changes away from a stream page
    for(var channel in data.channels) {
        if(tab.index==data.channels[channel].tabIndex&&!data.channels[channel].compareUrl(tab.url,channel)) {
            data.channels[channel].mute = false;
            data.channels[channel].tabIndex = -1;
        }
    }
};

exports.uncheckTab = function(tab) {
    for(var channel in data.channels) {
        if(data.channels[channel].compareUrl(tab.url)) {
            data.channels[channel].mute = false;
            data.channels[channel].tabIndex = -1;
        }
    }
};
