/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */
 
"use strict";

const Notifications = require("sdk/notifications");
var tabs = require("sdk/tabs");
var simplePrefs = require("sdk/simple-prefs");
var prefs = simplePrefs.prefs;
var passwords = require("sdk/passwords");
var self = require("sdk/self");
var _ = require("sdk/l10n").get;
var ss = require("sdk/simple-storage");
var { URL } = require("sdk/url");
var { Channel, ChannelList, Sources, Source, UpdateQueue, User } = require('./channellist');
var { getFileContents } = require('./utils');
var config = require('./config');

var livePanel;
var panelWidget, panelButton;
var queue = new UpdateQueue();
var data = ss.storage;

// disables simple storage (for cfx run) and enables debug outputs
var _testing;

exports.main = function() {
    if(self.loadReason=='install') {
        tabs.open({url:"http://jtvn.humanoids.be/first-run.html",inBackground:true});
        setConfig();
    }
    else if(self.loadReason=='upgrade'&&prefs.updateTab) {
        tabs.open({url:"http://jtvn.humanoids.be/changes-"+self.version+".html",inBackground:true});
        setConfig(); // remove me for 2.7+
    }
    //setConfig();
    _testing = config.getPreference("debug");
    
    // panel init
    console.log("initializing panel");
    var panelWidth = config.getPreference("panel.minWidth");
    livePanel = require("sdk/panel").Panel({
      width: panelWidth+12,
      contentURL: self.data.url("live-panel.html"),
      contentScriptOptions: {'minWidth':panelWidth,'advancedStyling':config.getPreference("panel.advancedStyle"),'backgroundImage':prefs.channelBackground,'showTitle':prefs.alwaysShowTitle}
    });
    getFileContents("chrome://browser/skin/browser.css", function(css) {
         livePanel.port.on("loaded",function() {
            console.log("sending stylesheets to panel");
            livePanel.port.emit("cssLoaded",css);
         });
    }); 
    
    // init neutral (not on channels relying) listeners here
    
    livePanel.port.on("resizePanel",function(dimensions) {
        livePanel.resize(dimensions[0],dimensions[1]);
        livePanel.port.emit("resizeDone");
    });
    
    this.setPanelAccess(prefs.panelAccess,true);
    
    // attach some listeners who need to be attached before attach() is called :S
    livePanel.port.on("loaded",function() {
        if(queue.containsPriorized()) {
            livePanel.port.emit("loadStart");
        }
        queue.on('queuepriorized',function() {
            livePanel.port.emit("loadStart");
        });
        queue.on('allpriorizedloaded',function() {
            livePanel.port.emit("loadEnd");
        });
    });
    
    // import add-on settings on first run/enable
    
    if(self.loadReason=='install'||self.loadReason=='enable'||self.loadReason=='upgrade') {        
        console.log("jtvn installed/enabled");
        //this.clear();
        this.init();
        this.attach();
    }
    // reset data if simplestorage is full
    else if(data.quotaDisabled||data==={}||_testing) {
        console.log("ss disabled");
        this.clear();
        data = {};
        this.init();
        this.attach();
        if(_testing) {
            console.log("in testing mode");
            config.setPreference("console.logLevel",'info');
        }
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
            var userObj;
            for(var user in data.users) {
                console.log("Reprototyping "+user);
                userObj = data.users[user];
                
                userObj.__proto__ = User.prototype;
                userObj.soruces.__proto__ = Sources.prototype;
                userObj.requestID = 0;
            }
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
                    
                    channelObj.requestID = 0;
                    
                    // fetch incomplete channels
                    if(channelObj.status == Channel.QUEUED) {
                        channelObj.requestID = exports.queue(require("./"+channelObj.type).getChannelDetails(channelObj.getFirstSourceObject(),false,completeChannel),false,true);
                    }                    
                    else {
                        // set the channel offline if the info is older than an hour
                        // this prevents most of the wrong live notifications on startup
                        // while still maintaining the "fast" init feel
                        if(channelObj.live&&Date.now-channelObj.lastUpdated>3600000) {
                            channelObj.live = false;
                            channelObj.update();
                        }
                        
                        livePanel.port.emit("add",channelObj);
                        channelObj.requestID = exports.queue(require("./"+channelObj.type).getStatusRequest(channel,true,exports.checkStatus),true,false);
                        
                        // display channels saved as live
                        if(channelObj.live)
                            data.setChannelLive(channel);
                    }
            }
            
            // do this afterwards; is safer.
            exports.updateFavorites();
            
            // update the channel states, so possibly no-longer-live channels get hidden.
            queue.autoFetch(1000*prefs.updateInterval,1/config.getPreference("queue.ratio"),config.getPreference("queue.maxRequestBatchSize"));
            exports.attach();
        });
    }
};

function setConfig() {
    // set default about:config prefs
    config.setPreference("queue.ratio",2);
    config.setPreference("queue.maxRequestBatchSize",8);
    config.setPreference("panel.minWidth",222);
    config.setPreference("panel.advancedStyle",true);
    config.setPreference("justintv.backgroundImageName",'channel_background_image_url');
    config.setPreference("justintv.apiKey",'nUiO8uME4MWnjNp9qhmpw');
    config.setPreference('justintv.ignoreRatelimit',false);
    config.setPreference('twitch.clientId','1owsrolvxz8khldqe6puadzd8bldq34');
    config.setPreference("justintv.backgroundImageName",'background');
    config.setPreference("debug",false);
}

exports.init = function() {
    data = new ChannelList();
    queue.autoFetch(1000*prefs.updateInterval,1/config.getPreference("queue.ratio"),config.getPreference("queue.maxRequestBatchSize"));
    this.attachChannelList();
    console.log("reading preferences");
    data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER,"justintv"),getUsernames(prefs.channelList),false);
    this.updateFavorites();
};

exports.onUnload = function(reason) {
    if(reason == 'uninstall' || reason == 'disable') {
        exports.clear();
    }
    else {
        queue.clear();
    }
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
        queue.changeInterval(1000*prefs.updateInterval,1/config.getPreference("queue.ratio"),config.getPreference("queue.maxRequestBatchSize"));
    });
    simplePrefs.on('channelList',function() {
        data.setChannels(new Source(Source.TYPE_USER,Source.TYPE_USER,"justintv"),getUsernames(prefs.channelList),false);
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
// various actions fired by the channelList
exports.attachChannelList = function() {
    console.log("Attaching channellist listeners");

    data.on('completechannelinfo',function(name,source) {
        data.channels[name].requestID = exports.queue(require("./"+source.channelType).getChannelDetails(new Source(source.type,name,source.channelType),false,completeChannel),false,true);
    });
    data.on('channeladded',function(channelObj) {
        console.log("adding "+channelObj+" to the panel");
        livePanel.port.emit("add",channelObj);
        channelObj.requestID = exports.queue(require("./"+channelObj.type).getStatusRequest(channelObj.login,true,exports.checkStatus),true,false);
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
        console.log("removing channel "+channelObj.login);
        if(channelObj.status!=Channel.QUEUED) {
            livePanel.port.emit("remove",channelObj.login);
        }
        // remove the channel update request
        exports.unqueue(channelObj.requestID);
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
    data.on('userdeleted',function(userObj) {
        console.log("removing user "+userObj.login);
        exports.unqueue(userObj.requestID);
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
    if(prefs.usernameList!='') {
        var usernames = getUsernames(prefs.usernameList);
        var s = new Source(Source.TYPE_USERNAME,Source.TYPE_USERNAME,"justintv");
        data.setUsers(usernames,s);
        for(var username of usernames) {
            username = 'j'+username;
            if(data.users[username].sources.onlySourceSet(s))
                data.users[username].requestID = exports.queue(require("./justintv").getUserFavorites(new Source(Source.TYPE_USERNAME,username,"justintv",{'page':0}),false,processUserFavorites),false,true);
        }
        
    }
    
    // we can directly check for removed channels here, since
    // possibly deferred channels of a removed username won't get added
    // in any case.
    // however we are missing out on channels removed from a users favs.
    for(var channel in data.channels) {
        for(var username in data.channels[channel].sources.usernames) {
            if(!data.userExists(data.channels[channel].sources.usernames[username])||data.users.length==0) {
                if(data.channels[channel].sources.onlySourceSet(new Source(Source.TYPE_USERNAME,username,"justintv"))||data.users.length==0) {
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
         /*passwords.search({
            url: 'http://www.justin.tv',
            onComplete: function(credentials) {
                credentials.forEach(function(credential) {
                    credential.username = 'j'+credential.username;
                    if(data.addUser(credential.username,new Source(Source.TYPE_CREDENTAILS,credential.username,"justintv")))
                        data.users[credential.username].requestID = exports.queue(require("./justintv").getUserFavorites(new Source(Source.TYPE_CREDENTIALS,credential.username,"justintv",{'page':0}),false,processUserFavorites),false,true);    
                });
            }
         });*/
         passwords.search({
            url: 'http://www.twitch.tv',
            onComplete: function(credentials) {
                var u;
                credentials.forEach(function(credential) {
                    if(data.addUser(credential.username,new Source(Source.TYPE_CREDENTAILS,credential.username,"twitch")))
                        data.users[credential.username].requestID = exports.queue(require("./twitch").getUserFavorites(new Source(Source.TYPE_CREDENTIALS,credential.username,"twitch",{'page':0}),false,processUserFavorites),false,true); 
                });
            }
         });
    }
    else {
        for(var channel in data.channels) {
            if(data.channels[channel].sources.onlySourceSet(new Source(Source.TYPE_CREDENTIALS,Source.TYPE_CREDENTIALS,"")))
				data.removeChannel(channel, true);
            else
                data.channels[channel].sources.credentialsSet = false;
        }
        for(var user in data.users) {
            if(data.users[user].sources.onlySourceSet(new Source(Source.TYPE_CREDENTIALS,Source.TYPE_CREDENTIALS,"")))
				data.removeUser(user);
            else
                data.users[user].sources.credentialsSet = false;
        }
    }
};

function completeChannel(status,uniChObj,source,ignoreNull) {
    if(status==1)  {
        console.log("Channel detail valid");
        if(data.channelExists(source.name) && data.channels[source.name].status==Channel.QUEUED) {
            console.log("adding channel");
            data.addChannel(uniChObj,source,true);
        }
    }
    else if(!ignoreNull&&status==2) {
        console.log("retrying getting channel details");
        data.channels[source.name].requestID = exports.queue(require("./"+source.channelType).getChannelDetails(source,ignoreNull,completeChannel),false,true);
    }
}

function processUserFavorites(status,response,source,ignoreNull,channelNames) {
    if(status==1) {
        console.log("user favorites valid");
        if(data.userExists(source.name)&&channelNames) {
            console.log("adding user favorite channels");
            data.setChannels(source,channelNames,true);
            // get next page if this one was full
            if(response.length==100) {
                source.page++;
                data.users[source.name].requestID = exports.queue(require("./"+source.channelType).getUserFavorites(source,ignoreNull,processUserFavorites),false,true);
            }
        }
    }
    else if(!ignoreNull&&status==2)
        data.users[source.name].requestID = exports.queue(require("./"+source.channelType).getUserFavorites(source,ignoreNull,processUserFavorites),false,true);
}

function getUsernames(string) {
    return string.replace(" ","").split(','); // remove spaces and split by commas
};

/*
 * live status queries
 */

// this creates a query completely unbound from the background requestqueue.
exports.forceRefresh = function() {
    queue.getRequestBatch(config.getPreference("queue.maxRequestBatchSize"));
};

exports.queue = function(requestObject,persist,priorize) {
    var id = queue.addRequest(requestObject,persist,priorize);
    if(priorize&&prefs.updateInterval==0) {
        queue.getRequestById(id);
    }
    return id;
};
exports.unqueue = function(query) {
    queue.removeRequest(query);
}

exports.checkStatus = function(status,result,channel,ignoreNull) {
    if(status==1) {
        try {
            var channelObj = data.channels[channel];
            channelObj.status = Channel.FULL;
            channelObj.update();
            if(result.length>0) {
                var uniChObj = require('./'+channelObj.type).getBasicUniChannelInfo(result[0]);
                if(!channelObj.live) {
                    channelObj.image[0] = uniChObj.panelAvatar;
                    channelObj.image[1] = uniChObj.notificationAvatar;
                    channelObj.title = uniChObj.title;
                    
                    data.setChannelLive(channel);
                }
                else if(channelObj.live&&channelObj.title!=uniChObj.title) {
                    channelObj.image[0] = uniChObj.panelAvatar;
                    channelObj.image[1] = uniChObj.notificationAvatar;
                    channelObj.title = uniChObj.title;
                    
                    livePanel.port.emit("updateTitle",channelObj);
                    if(!channelObj.mute&&prefs.titleChangeNotification)
                        this.sendNotification(channelObj.title,channelObj.channel.image_url_medium,channel,true);
                }
            }
            else if(!result.length&&data.channels[channel].live) {
                data.removeChannel(channel,false);
            }
        }
        catch(e) {}
    }
    else if(status==2&&!ignoreNull) {
        data.channels[channel].requestID = this.queue(require("./"+data.channels[channel].type).getStatusRequest(channel,ignoreNull,exports.checkStatus),true,false);
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
        if(data.channels[channel].compareUrl(tab.url)) {
            tab.activate();
            return;
        }
    }
    tabs.open(data.channels[channel].live?data.channels[channel].url[0].toString():getArchiveUrl(channel,0).toString());
};

function getArchiveUrl(channel,index) {
    var channelObj = data.channels[channel];
    return URL(require("./"+channelObj.type).archiveURL.replace("%u",channelObj.url[index].toString()));
}


exports.checkTab = function(tab) {
    if(tab.id == tabs.activeTab.id) {
        for(var channel in data.channels) {
            if(data.channels[channel].compareUrl(tab.url)) {
                data.channels[channel].mute = true;
                data.channels[channel].tabIndex = tab.id;
            }
        }
    }
    
    // if the location of a tab changes away from a stream page
    for(var channel in data.channels) {
        if(tab.id==data.channels[channel].tabIndex&&!data.channels[channel].compareUrl(tab.url)) {
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
