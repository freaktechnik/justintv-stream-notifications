/**
 * Desktop Listview adapter
 * @author Martin Giger
 * @license MPL-2.0
 * @module list/firefox
 */

"use strict";

import { Panel } from 'sdk/panel';
import { ToggleButton } from 'sdk/ui';
import sp from 'sdk/simple-prefs';
import { get as _ } from 'sdk/l10n';
import { emit } from "sdk/event/core";
import EventTarget from "../event-target";

const { prefs } = sp;

const liveIcons = {
    "18": "./icon18.png",
    "32": "./icon32.png",
    "36": "./icon36.png", //hidpi
    "48": "./icon.png",
    "64": "./icon64.png" // hidpi
},
offlineIcons = {
    "18": "./offline18.png",
    "32": "./offline32.png",
    "36": "./offline36.png", //hidpi
    "64": "./offline64.png" // hidpi
};

const forwardEvent = function(event, close, ...args) {
    if(close)
        this.panel.hide();
    emit(this, event, ...args);
};

const EVENTS = [
    {
        name: "configure",
        close: true
    },
    {
        name: "refresh",
        close: false
    },
    {
        name: "open",
        close: true
    },
    {
        name: "add",
        close: false
    },
    {
        name: "explore",
        close: false
    },
    {
        name: "search",
        close: false
    },
    {
        name: "ready",
        close: false
    },
    {
        name: "pause",
        close: false
    },
    {
        name: "resume",
        close: false
    }
];

/**
 * @class
 * @extends module:event-target.EventTarget
 */
export default class PanelList extends EventTarget {
    constructor(live, style, extras, nonLiveDisplay) {
        super();
        this.live = new Set();

        // Construct Buttons
        this.button = new ToggleButton({
            id: "live-channels-button",
            label: live ? _("live_widget_label") : _("live_widget_label_offline"),
            icon: live ? liveIcons : offlineIcons,
            onClick: (state) => {
                if(!state.checked)
                    this.panel.hide();
                else
                    this.panel.show();
            }
        });
        this.panel = new Panel({
            width: this.panelWidth,
            position: this.button,
            contextMenu: true,
            contentURL: "./list.html",
            contentScriptOptions: {
                "maxHeight": prefs.panel_maxHeight,
                "panelWidth": prefs.panel_minWidth,
                style,
                extras,
                nonLiveDisplay
            },
            onHide: () => {
                if(this.button.state("window").checked)
                    this.button.state("window", {"checked": false});
            },
            onShow: () => this.panel.port.emit("resize")
        });

        this.panel.port.on("resize", (dimensions) => {
            this.panel.resize(dimensions[0], dimensions[1]);
        });

        EVENTS.forEach((e) => this._registerEvent(e.name, e.close));

        this.panel.port.on("openChat", (channelId) => {
            this.panel.hide();
            emit(this, "open", channelId, "chat");
        });

        this.panel.port.on("openArchive", (channelId) => {
            this.panel.hide();
            emit(this, "open", channelId, "archive");
        });

        this.panel.port.on("openUrl", (url) => {
            this.panel.hide();
            emit(this, "open", url);
        });

        this.panel.port.on("removedLive", (id) => {
            this.live.delete(id);
            this.updateBadge();

            if(this.live.size === 0) {
                emit(this, "offline");
            }
        });

        sp.on("panel_badge", () => {
            this.updateBadge();
        });
    }

    _registerEvent(event, close) {
        this.panel.port.on(event, forwardEvent.bind(this, event, close));
    }

    updateBadge() {
        if(prefs.panel_badge && this.live.size > 0) {
            this.button.badge = this.live.size;
        }
        else {
            this.button.badge = null;
        }
    }

    setLiveState(state) {
        if(state) {
            this.button.icon = liveIcons;
            this.button.label = _("live_widget_label");
        }
        else {
            this.button.icon = offlineIcons;
            this.button.label = _("live_widget_label_offline");
            this.live.clear();
            this.updateBadge();
        }
    }

    setStyle(style) {
        this.panel.port.emit("setStyle", style);
    }

    setExtras(extras) {
        this.panel.port.emit("setExtras", extras);
    }

    setNonLiveDisplay(style) {
        this.panel.port.emit("setNonLiveDisplay", style);
    }

    addChannels(channels) {
        channels.forEach(function(chan) {
            if(chan.live.isLive) {
                this.live.add(chan.id);
            }
        }, this);
        this.updateBadge();
        this.panel.port.emit("addChannels", channels);
    }

    removeChannel(channelId) {
        this.panel.port.emit("removeChannel", channelId);
    }

    setOnline(channel) {
        if(!this.live.has(channel.id)) {
            this.live.add(channel.id);
            this.updateBadge();
        }
        this.panel.port.emit("setOnline", channel);
    }

    internalSetOffline(channelId) {
        if(this.live.has(channelId)) {
            this.live.delete(channelId);
            this.updateBadge();

            if(this.live.size === 0) {
                emit(this, "offline");
            }
        }
    }

    setOffline(channel) {
        this.internalSetOffline(channel.id);
        this.panel.port.emit("setOffline", channel);
    }

    setDistinct(channel) {
        this.internalSetOffline(channel.id);
        this.panel.port.emit("setDistinct", channel);
    }

    setProviders(providers) {
        this.panel.port.emit("setProviders", providers);
    }

    setFeatured(channels, type, q) {
        this.panel.port.emit("setFeatured", channels, type, q);
    }

    setQueueStatus(enabled) {
        this.panel.port.emit("queueStatus", enabled);
    }

    setQueuePaused(paused) {
        this.panel.port.emit("queuePaused", paused);
    }
}
