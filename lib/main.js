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
var { exactArraySearch, getFileContents } = require('./utils');

var livePanel;
var panelWidget, panelButton;
var intId;
var data = ss.storage;
// this is secret
var oauthKey = 'nUiO8uME4MWnjNp9qhmpw';

// disables simple storage (for cfx run) and enables debug outputs
var _testing = false;

exports.main = function() {
    if(self.loadReason=='install') {
        tabs.open({url:"http://jtvn.humanoids.be/first-run.html",inBackground:true});
    }
    else if(self.loadReason=='upgrade'&&prefs.updateTab) {
        tabs.open({url:"http://jtvn.humanoids.be/changes-"+self.version+".html",inBackground:true});
    }
    
    // panel init

    var nativeCss = getFileContents("chrome://browser/skin/browser.css");
    var panelWidth = 212;
    livePanel = require("sdk/panel").Panel({
      width: panelWidth+12,
      contentURL: self.data.url("live-panel.html"),
      contentScriptOptions: {'minWidth':panelWidth,'css':nativeCss}
    });
    
    // init neutral (not on channels relying) listeners here
    
    livePanel.port.on("resizePanel",function(dimensions) {
        livePanel.resize(dimensions[0],dimensions[1]);
        livePanel.port.emit("resizeDone");
    });    
    
    this.setPanelAccess(prefs.panelAccess,true);
    
    // import add-on settings on first run/enable
    
    if(self.loadReason=='install'||self.loadReason=='enable') {
        console.log("jtvn installed/enabled");
        this.clear();
        this.init();
        this.attach();
    }
    // reset data if simplestorage is full
    else if(data.quotaDisabled||data==={}) {
        console.log("ss disabled");
        this.clear();
        data = {};
        this.init();
        this.attach();
    }
    else {
        console.log("restoring ss");
        // normal init when browser is loaded. Needs to wait for the panel,
        // so channels can get added to the offline list.
        livePanel.port.on("loaded",function() {
            // simple storage doesn't save prototypes
            data.__proto__ = ChannelList.prototype;
            data.initLength();
            exports.attachChannelList();
            var channelObj;
            for(var channel in data.channels) {
                    console.log("Reprototyping "+channel);
                    channelObj = data.channels[channel];

                    // reset the Object types
                    channelObj.urls.forEach(function(url,index) {
                        // we need to redefine the URL objects, sadly.
                        channelObj.url[index] = new URL(url);
                    });
                    channelObj.__proto__ = Channel.prototype;
                    channelObj.sources.__proto__ = Sources.prototype;
                    
                    // handle statusses
                    // reset updating channels to normal state
                    if(channelObj.status == Channel.UPDATING)
                        channelObj.status = Channel.FULL;
                    // fetch incomplete channels
                    else if(channelObj.status == Channel.QUEUED) {
                        exports.checkRateLimit(channelObj.getFirstSourceObject(),exports.getChannelDetails,false);
                    }
                    else {
                        livePanel.port.emit("add",channelObj);
                        
                        // display channels saved as live
                        if(channelObj.live)
                            data.setChannelLive(channel);
                    }
            }
            
            // do this afterwards; is safer.
            exports.updateFavorites();
            
            // update the channel states, so possibly no-longer-live channels get hidden.
            exports.query();
            exports.attach();
        });
    }
    
    if(_testing) {
        console.log("in testing mode");
        this.clear();
        data = {};
        this.init();
        //this.attach();
    }
    
    ss.on("OverQuota", function() {
        console.log("ss full");
        
        // wipe storage
        data.channels = [];
        data.users = [];
        data.quotaDisabled = true;
        
        // set up local stuff

        exports.clear();
        exports.init();
    });
};

exports.init = function() {
    data = new ChannelList();
    this.attachChannelList();
    data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER),getUsernames(prefs.channelList),false);
    this.updateFavorites();
};

exports.clear = function() {
    delete data.channels;
    delete data.users;
    data.__proto__ = Object;
};

exports.attach = function() {
    console.log("attaching listeners");
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
    
    // settings
    if(prefs.updateInterval>0)
        intId = timer.setInterval(this.query,1000*prefs.updateInterval);
    else intId = false;
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
    simplePrefs.on('panelAccess', function() {
        exports.setPanelAccess(prefs.panelAccess);
    });
    
    // channellist dependent panel events
    livePanel.port.on("openTab",function(channel) {
        exports.openTab(channel);
    });
    livePanel.port.on("refresh",function() {
        exports.query();
    });
};
// various actions fired by the channelList
exports.attachChannelList = function() {
    console.log("Attaching channellist listeners");

    data.on('completechannelinfo',function(name,source) {
        exports.checkRateLimit(new Source(source.type,name),exports.getChannelDetails,false);
    });
    data.on('channeladded',function(channelObj) {
        console.log("adding "+channelObj+" to the panel");
        livePanel.port.emit("add",channelObj);
    });
    data.on('channeloffline',function(channelObj) {
        console.log("moving "+channelObj.login);
        livePanel.port.emit('move',channelObj);
        
        if(!channelObj.mute&&prefs.offlineNotification)
				exports.sendNotification( channelObj.title, channelObj.image[1],channelObj.login,false);
                
        if(!data.liveStatus()) {
            if(prefs.panelAccess == 0 && panelWidget.contentURL == self.data.url("panel_icon.png")) {
                panelWidget.contentURL = self.data.url("panel_icon_empty.png");
                panelWidget.tooltip = _("live_panel_label_offline");
            }
            else if(prefs.panelAccess == 1 && panelButton.image == self.data.url("panel_icon.png")) {
                panelButton.image = self.data.url("panel_icon_empty.png");
                panelButton.tooltiptext = _("live_panel_label_offline");
            }
        }
    });
    data.on('channeldeleted',function(channelObj) {
        console.log("removing "+channelObj.login);
        if(channelObj.status!=Channel.QUEUED)
            livePanel.port.emit("remove",channelObj.login);
    });
    data.on('channellive',function(channelObj) {
        if(!channelObj.mute&&prefs.onlineNotification)
            exports.sendNotification(channelObj.title,channelObj.image[1],channelObj.login,true);
            
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
    
    // only check the live status if the ChannelList can be ready
    if(!ignoreLive)
        live = data.liveStatus();
    
    if(type==0) {
        // the panel is removed before the button gets destroyed, so it doesn't need to be
        // reinitialized every time the setting is switched.
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
        panelButton.moveTo({toolbarID: "nav-bar"});
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
                    data.removeChannel(channel, true);
                }
                else {
                    data.channels[channel].sources.usernames.splice(username,1);
                }
            }
        }
    }
};

// check the credentials for a console.login to twitch or justin.tv. If found fetch the
// favorites of sutch a user.
// this function also removes any channels with only credentials as source when
// the setting gets unchecked
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
				data.removeChannel(channel, true);
            else
                data.channels[channel].sources.credentialsSet = false;
        }
    }
};

// gets the favorites of a user (specified in soruce.name)
exports.getUserFavorites = function(source,ignoreNull) {
    var favoritesRequest = Request({
        url: 'https://api.justin.tv/api/user/favorites/'+source.name+'.json?limit=100&offset='+source.page*100,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function(response) {
            console.log("user favorites got");
            var r = exports.checkResponse(response);
            if(r==1) {
                console.log("user favorites valid");
                if(exactArraySearch(data.users,source.name,false)||source.type==Source.TYPE_CREDENTIALS)
                    exports.extractChannelsFromFavorites(source,response.json);
            }
            else if(!ignoreNull&&r==2)
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber(),source,exports.getUserFavorites,ignoreNull);
        }
    });
    console.log("getting user favorites");
    favoritesRequest.get();
};

// getches the API channel object for a specified channel (source.name)
exports.getChannelDetails = function(source,ignoreNull) {
    var detailRequest = Request({
        url: 'https://api.justin.tv/api/channel/show/'+source.name+'.json',
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel details got");
            var r= exports.checkResponse(response);
            if(r==1)  {
                console.log("Channel detail valid");
                if(data.channelExists(source.name) && data.channels[source.name].status==Channel.QUEUED) {
                    console.log("addong channel");
                    data.addChannel(response.json,source,true);
                }
            }
            else if(!ignoreNull&&r==2) {
                console.log("retrying getting channel details");
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber(),source,exports.getChannelDetails,ignoreNull);
            }
        }
    });
    console.log("getting channel details");
    detailRequest.get();
};

// this parses a favorites request and adds the channels
exports.extractChannelsFromFavorites = function(source,response) {
    if(response.length>0) {
        var channelNames = [];
        response.forEach(function(channel) {
            channelNames.push(channel);
        });
        console.log("adding channels");
        data.setChannels(source,channelNames,true);
        
        // get next page if this one was full
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
    return string.replace(" ","").split(','); // remove spaces and split by commas
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
            var r = exports.checkResponse(response);
            if(r==1) {
                console.log("ratelimit response was valid");
                completeFunction(channel,ignoreNull);
            }
            else if(!ignoreNull&&r==2) {
                console.log("refetching ratelimit");
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber,channel,completeFunction,ignoreNull);
            }
            else if(data.channelExists(channel)&&data.channels[channel].status==Channel.UPDATING)
                data.channels[channel].status = Channel.FULL;
        }
    });
    console.log("getting rate limit");
    rateRequest.get();
};

exports.createQuery = function(channel,ignoreNull) {
    var liveStatusRequest = Request({
        url: 'https://api.justin.tv/api/stream/list.json?channel='+channel,
        headers: {'Authorization':'Bearer '+oauthKey},
        onComplete: function (response) {
            console.log("channel updated");
            var r = exports.checkResponse(response);
            if(r==1)
                exports.checkStatus(response.json,channel);
            else if(!ignoreNull&&r==2)
                timer.setTimeout(exports.checkRateLimit,randomDelayNumber,channel,exports.createQuery,ignoreNull);
            else
                data.channels[channel].status = Channel.FULL;
        }
    });
    console.log("updating channel");
    liveStatusRequest.get();
};

exports.checkResponse = function(response) {
    // check if we even got a response
    if(response!=null) {
        // check if we got any content
        if(response.status==200) {
            var json = response.json;
            // check if we encountered an API error
            var e = json.hasOwnProperty("error");
            var r = json.hasOwnProperty("rate_limited");
            if(!e&&(!r||!json.rate_limited)) {
                console.log("request ok");
                return 1;
            }
            // ignore not fatal API errors
            else if((e&&json.error!="couldn't find user"&&json.error!="couldn't find channel")||r) {
                console.log("No fatal error. Retrying");
                return 2;
            }
            console.log("Request failed");
            return 0;
        }
        // check the response error
        else if((response.status<400||response.status>=500)&&response.status!=0) {
            console.log("Status code OK, retrying: "+response.status);
            return 2;
        }
        console.log("Request failed: "+response.status);
        return 0;
    }
    // if it was empty, retry.
    console.log("Empty response. Retrying");
    return 2;
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
    if(tab.id == tabs.activeTab.id) {
        for(var channel in data.channels) {
            if(data.channels[channel].compareUrl(tab.url,channel)) {
                data.channels[channel].mute = true;
                data.channels[channel].tabIndex = tab.id;
            }
        }
    }
    
    // if the location of a tab changes away from a stream page
    for(var channel in data.channels) {
        if(tab.id==data.channels[channel].tabIndex&&!data.channels[channel].compareUrl(tab.url,channel)) {
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
