/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Controller of the extension
 */
var prefs = require('sdk/simple-prefs'),
    self  = require('sdk/self'),
    tabs  = require('sdk/tabs');

var { ListView }        = require('./listview'),
    { Notifier }        = require('./notifier'),
    { UpdateQueue }     = require('./queue'),
    { ChannelList }     = require('./channellist'),
    { ChannelsManager } = require('./channels-manager');

const BASE_URL = "http://jtvn.humanoids.be";

// setup objects and events
var view,
    queue    = new UpdateQueue(), //TODO make queue work
    cm       = new ChannelsManager(),
    notifier = new Notifier({
        onlineNotifications : prefs.prefs.onlineNotification,
        titleNotifications  : prefs.prefs.titleChangeNotification,
        offlineNotifications: prefs.prefs.offlineNotification
    }),
    list     = new ChannelList({
        onReady: function() {
            list.liveStatus(false, function(live) {
                view = new ListView(live, 1);
            });
        },
        onChannelupdated: function(channel) {
            notifier.sendNotification(channel);
        }
    });

// Preference change listeners
prefs.on("manageChannels", function() {
    cm.open();
});

prefs.on("onlineNotification", function() {
    notifier.onlineNotifications = prefs.prefs.onlineNotification;
});

prefs.on("titleChangeNotification", function() {
    notifier.titleNotifications = prefs.prefs.titleChangeNotification;
});

prefs.on("offlineNotification", function() {
    notifier.offlineNotifications = prefs.prefs.offlineNotification;
});

// extension installation/upgrade stuff
if(self.loadReason == "install") {
    if(prefs.prefs.updateTab) // respect user's prefs that reinstall the extension
        tabs.open({url: BASE_URL + "/first-run.html"});
}
else if(self.loadReason == "upgrade") {
    if(prefs.prefs.updateTab)
        tabs.open({url: BASE_URL + "/changes-" + self.version + ".html"});

    //TODO migrate channels to channels-manager
}

