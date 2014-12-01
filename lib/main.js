/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Controller of the extension
 */
var prefs = require('sdk/simple-prefs');

var { ListView } = require('./listview'),
    { Notifier } = require('./notifier'),
    { UpdateQueue } = require('./queue'),
    { ChannelList } = require('./channellist'),
    { ChannelsManager } = require('./channels-manager');

var view,
    queue    = new UpdateQueue(prefsnstuff), //TODO make queue work
    cm       = new ChannelsManager(),
    notifier = new Notifier({
        onlineNotifications : prefs.prefs.onlineNotification,
        titleNotifications  : prefs.prefs.titleChangeNotification,
        offlineNotifications: prefs.prefs.offlineNotification
    }),
    list     = new ChannelList({
    onReady: function() {
        list.liveStatus(false, function(live) {
            view = new ListView(live, prefs.prefs.panel_style);
        });
    },
    onChannelupdated: function(channel) {
        notifier.sendNotification(channel);
    }
});

prefs.on("manageChannels", function() {
    cm.open();
});

//TODO open tab on update/install
//TODO upgrade stuff?

