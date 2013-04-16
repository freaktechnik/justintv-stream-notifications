/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

const Notifications = require("sdk/notifications");
var tabs = require("sdk/tabs");
var simplePrefs = require("sdk/simple-prefs");
var prefs = simplePrefs.prefs;
var passwords = require("sdk/passwords");
var self = require("sdk/self");
var _ = require("sdk/l10n").get;
var ss = require("sdk/simple-storage");
var { URL } = require("sdk/url");
var { Channel, ChannelList, Sources, Source, UpdateQueue } = require('./channellist');
var { exactArraySearch, getFileContents } = require('./utils');

var livePanel;
var panelWidget, panelButton;
var queue = new UpdateQueue();
var data = ss.storage;

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
                    
                    // fetch incomplete channels
                    else if(channelObj.status == Channel.QUEUED) {
                        exports.queue(channelObj.type,channelObj.getFirstSourceObject(),false,require("./"+channelObj.type).getChannelDetails,completeChannel);
                    }
                    else {
                        livePanel.port.emit("add",channelObj);
                        exports.queue(channelObj.type,channel,true,require("./"+channelObj.type).statusRequest,exports.checkStatus);
                        
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
    queue.autoFetch(1000*prefs.updateInterval,.5,10);
    this.attachChannelList();
    data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER),getUsernames(prefs.channelList),false);
    this.updateFavorites();
};

exports.clear = function() {
    delete data.channels;
    delete data.users;
    data.__proto__ = Object;
    
    queue.clear();
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

    simplePrefs.on('updateInterval',function() {
        queue.changeInterval(1000*prefs.updateInterval.5,10);
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
        exports.forceRefresh();
    });
};
// various actions fired by the channelList
exports.attachChannelList = function() {
    console.log("Attaching channellist listeners");

    data.on('completechannelinfo',function(name,source,type) {
        exports.queue(type,new Source(source.type,name),false,require("./"+type).getChannelDetails,completeChannel);
    });
    data.on('channeladded',function(channelObj) {
        console.log("adding "+channelObj+" to the panel");
        livePanel.port.emit("add",channelObj);
        exports.queue(channelObj.type,channel,true,require("./"+channelObj.type).statusRequest,exports.checkStatus);
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
           exports.queue("justintv",new Source(Source.TYPE_USERNAME,username,{'page':0}),false,require("./justintv").getUserFavorites,processUserFavorties);
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
                    exports.queue("justintv",new Source(Source.TYPE_CREDENTIALS,credential.username,{'page':0}),false,require("./justintv").getUserFavorites,processUserFavorties);                    
                });
            }
         });
         passwords.search({
            url: 'http://www.twitch.tv',
            onComplete: function(credentials) {
                credentials.forEach(function(credential) {
                    exports.queue("justintv",new Source(Source.TYPE_CREDENTIALS,credential.username,{'page':0}),false,require("./justintv").getUserFavorites,processUserFavorties); 
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

function completeChannel(status,response,source,ignoreNull) {
    if(status==1)  {
        console.log("Channel detail valid");
        if(data.channelExists(source.name) && data.channels[source.name].status==Channel.QUEUED) {
            console.log("adding channel");
            data.addChannel(response,source,true);
        }
    }
    else if(!ignoreNull&&status==2) {
        console.log("retrying getting channel details");
        exports.queue("justintv",source,ignoreNull,require("./justintv").getChannelDetails,completeChannel);
    }
}

function processUserFavorites(status,response,source,ignoreNull,channelNames) {
    if(status==1) {
        console.log("user favorites valid");
        if(exactArraySearch(data.users,source.name,false)||source.type==Source.TYPE_CREDENTIALS) {
            console.log("adding user favorite channels");
            data.setChannels(source,channelNames,true);
        
            // get next page if this one was full
            if(response.length==100) {
                source.page++;
                exports.queue("justintv",source,ignoreNull,require("./justintv").getUserFavorites,processUserFavorties);
            }
        }
    }
    else if(!ignoreNull&&status==2)
        exports.queue("justintv",source,ignoreNull,require("./justintv").getUserFavorites,processUserFavorties);
}

function getUsernames(string) {
    return string.replace(" ","").split(','); // remove spaces and split by commas
};

/*
 * live status queries
 */

// this creates a query completely unbound from the background requestqueue.
exports.forceRefresh = function() {
    var channelProvider;
    for(var channel in data.channels) {
        channelProvider = require("./"+data.channels[channel].type);
        channelProvider.checkRateLimit(channel,channelProvider.statusRequest,true);
    }
};

exports.queue = function(type,channel,ignoreNull,completeFunction,callback) {
    if(ignoreNull) {
        queue.addRequest(data[channel]);
    }
    else {
        queue.addRequest(require("./"+type).getRequest(channel,completeFunction,ignoreNull),callback);
    }
};

exports.checkStatus = function(status,result,channel,ignoreNull) {
    if(status==1) {
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
    }
    else if(status==2&&!ignoreNull) {
        this.queue(data.channels[channel].type,ignoreNull,channel,require("./"+data.channels[channel].type).statusRequest,exports.checkStatus);
    }
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
