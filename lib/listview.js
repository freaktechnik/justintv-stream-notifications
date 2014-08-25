/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Model for the Panel
 */

const { Panel } = require('sdk/panel');
const { ToggleButton } = require('sdk/ui');
var { prefs } = require("sdk/simple-prefs");

const liveIcons = {
    "18": "./icon18.png",
    "32": "./icon32.png",
    "36": "./icon36.png", //hidpi
    "64": "./icon64.png" // hidpi
},
offlineIcons = {
    "18": "./offline18.png",
    "32": "./offline32.png",
    "36": "./offline36.png", //hidpi
    "64": "./offline64.png" // hidpi
};

ListView.prototype.button = null;
ListView.prototype.panel = null;
ListView.prototype.panelWidth = {
    get() {
        return prefs.panel_mindWidth;
    }
};
ListView.prototype.liveState = false;
ListView.prototype.channels = [];
function ListView(live) {
    this.liveState = live;
    this.channels = [];
    var that = this;
    // Construct Buttons
    this.button = ToggleButton({
        id: "live-channels-button",
        label: this.liveState?_("live_widget_label"):_("live_panel_label_offline"),
        icon: this.liveState?liveIcons:offlineIcons,
        onClick: function(state) {
            if(!state.checked)
                that.panel.hide();
            else
                that.panel.show({position: that.button});
        }
    });
    this.panel = Panel({
        width: this.panelWidth,
        contentURL: "./listview.xul",
        contentScriptOptions: {
            "minWidth": this.panelWidth
        }
    });

    this.panel.on("hide", function() {
        if(that.button.state("window").checked)
            that.button.state("window", {"checked": false});
    });
    this.panel.port.on("resizePanel", function(dimensions) {
        that.panel.resize(dimensions[0], dimensions[1]);
    });
}

ListView.prototype.setLiveState = function(live) {
    this.liveState = live;
    if(live) {
        this.button.icon = liveIcons;
        this.button.label = _("live_widget_label");
    }
    else {
        this.button.icon = offlineIcons;
        this.button.label = _("live_panel_label_offline");
    }
};

ListView.prototype.addChannels = function(channels) {
    this.channels = this.channels.concat(channels).sort(function(channelA, channelB) {
        return channelA.name.localeCompare(channelB.name);
    });
    this.panel.port.emit("updateChannels", this.channels);
};
ListView.prototype.removeChannels = function(channels) {
    channels.forEach(function(channel) {
        if(this.channels.indexOf(channel) != -1) {
            this.channels.slice(this.channels.indexOf(channel), 1);
        }
    }, this);
    this.panel.port.emit("updateChannels", this.channels);
};
ListView.setChannelsLive = function(channels) {};
ListView.setChannelsOffline = function(channels) {};

// open tab

exports.ListView = ListView;
