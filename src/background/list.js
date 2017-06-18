/**
 * Model for the Panel.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module list
 * @requires module:channel/utils
 * @requires module:list/firefox
 * @todo coutner badge vs. live state handling change
 */
// setup event handling
import { emit } from "../utils";
import prefs from "./preferences";
import LiveState from "./channel/live-state";
import providers from './providers';
import EventTarget from 'event-target-shim';
import Port from '../port';
import serializedProviders from "./providers/serialized";

/**
 * Should open the ChannelsManager.
 *
 * @event module:list.ListView#opencm
 */
/**
 * Passes two arguments: type and login of the channel to add.
 *
 * @event module:list.ListView#addchannel
 */
/**
 * The user triggered a manual refresh from the list. Optionally holds the ID of
 * the channel to update, else all channels are to be updated.
 *
 * @event module:list.ListView#refresh
 * @type {number?}
 */
/**
 * The user wishes to open the a channel by approriate means. The second
 * parameter specifies the means, like the "what" parameter of
 * {@link module:channel/utils.selectOrOpenTab}.
 *
 * @event module:list.ListView#open
 * @type {number}
 */
/**
 * The user wishes to pause the update queue.
 *
 * @event module:list.ListView#pause
 */
/**
 * The user wishes to resume the update queue.
 *
 * @event module:list.ListView#resume
 */
/**
 * The list is ready for modifications.
 *
 * @event module:list.ListView#ready
 */
/**
 * @typedef Style
 * @type {number}
 */
/**
 * @typedef {number} NonLiveDisplay
 */

const LIVE_ICONS = {
        "16": "assets/images/icon16.png",
        "18": "assets/images/icon18.png",
        "32": "assets/images/icon32.png",
        "36": "assets/images/icon36.png",
        "48": "assets/images/icon48.png",
        "64": "assets/images/icon64.png"
    },
    OFFLINE_ICONS = {
        "16": "assets/images/offline16.png",
        "18": "assets/images/offline18.png",
        "32": "assets/images/offline32.png",
        "36": "assets/images/offline36.png",
        "48": "assets/images/offline48.png",
        "64": "assets/images/offline64.png"
    },
    _ = browser.i18n.getMessage;

/**
 * @class module:list.ListView
 * @extends external:EventTarget
 */
class ListView extends EventTarget {
    /**
     * @const {module:list~Style}
     * @default 0
     */
    static STYLE_COMPACT = 0;
    /**
     * @const {module:list~Style}
     * @default 1
     */
    static STYLE_NORMAL = 1;
    /**
     * @const {module:list~Style}
     * @default 2
     */
    static STYLE_THUMBNAIL = 2;

    /**
     * Display non-live channels as live.
     *
     * @const {module:list~NonLiveDisplay}
     * @default 0
     */
    static LIVE = 0;
    /**
     * Display non-live channels as live but sort them to the bottom if possible.
     * @const {module:list~NonLiveDisplay}
     * @default 1
     */
    static LIVE_BOTTOM = 1;
    /**
     * Display non-live channels in their own category.
     * @const {module:list~NonLiveDisplay
     * @default 2
     */
    static DISTINCT = 2;
    /**
     * Display non-live channels as offline (ignore their liveness). This is handled
     * directly in this module, so the channel gets passed as going offline.
     * @const {module:list~NonLiveDisplay}
     * @default 3
     */
    static OFFLINE = 3;

    ready = false;
    /**
     * @constructs
     * @fires module:list.ListView#opencm
     * @fires module:list.ListView#addchannel
     * @fires module:list.ListView#ready
     * @fires module:list.ListView#open
     * @fires module:list.ListView#refresh
     * @fires module:list.ListView#pause
     * @fires module:list.ListView#resume
     * @alias module:list.ListView
     */
    constructor() {
        super();

        this._liveState = false;
        this.live = new Set();
        this.nonlive = new Set();

        this.port = new Port("list");
        this.port.addEventListener("message", ({ detail: event }) => {
            switch(event.command) {
            case "open":
            case "openUrl":
                emit(this, "open", event.payload);
                break;
            case "openChat":
                emit(this, "open", event.payload, "chat");
                break;
            case "openArchive":
                emit(this, "open", event.payload, "archive");
                break;
            case "refresh":
            case "copy":
            case "copied":
                emit(this, event.command, event.payload);
                break;
            case "configure":
                emit(this, "opencm");
                break;
            case "add":
                emit(this, "addchannel", event.payload.type, event.payload.login);
                break;
            case "pause":
            case "resume":
                emit(this, event.command);
                break;
            case "ready":
                this.ready = true;
                emit(this, "ready");
                this.setNonLiveDisplay();
                this.setStyle();
                this.setExtrasVisibility();
                this.setTheme();
                this.setQueueStatus();
                this.setProviders();
                break;
            case "search":
                providers[event.payload.type].search(event.payload.query)
                    .then((channels) => this.setFeatured(channels.map((c) => c.serialize()), event.payload.type, event.payload.query),
                        () => this.setFeatured([], event.payload.type, event.payload.query));
                break;
            case "explore":
                if(event.payload) {
                    providers[event.payload].getFeaturedChannels()
                        .then((channels) => this.setFeatured(channels.map((c) => c.serialize()), event.payload),
                            () => this.setFeatured([], event.payload));
                }
                break;
            case "copyexternal":
                emit(this, "copy", event.payload.login, event.payload.type);
                break;
            case "removedLive":
                this._unregisterChannel(event.payload);
                break;
            default:
                // Nothing to do here.
            }
        }, {
            passive: true
        });

        prefs.addEventListener("change", ({ detail: event }) => {
            if(event.pref == "panel_badge") {
                this.updateBadge();
            }
        }, { passive: false });
    }

    _emitToList(event, data) {
        this.port.send(event, data);
    }

    get countNonlive() {
        return this.nonLiveDisplay < ListView.DISTINCT;
    }

    async updateBadge() {
        const size = this.live.size + (this.countNonlive ? this.nonlive.size : 0);
        if(size > 0) {
            if(await prefs.get("panel_badge")) {
                browser.browserAction.setBadgeText({
                    text: size.toString()
                });
            }
            else {
                browser.browserAction.setBadgeText({
                    text: ""
                });
            }

            browser.browserAction.setIcon({
                path: LIVE_ICONS
            });
            browser.browserAction.setTitle({
                title: _("listTooltipLive")
            });
        }
        else {
            browser.browserAction.setBadgeText({
                text: ""
            });
            browser.browserAction.setIcon({
                path: OFFLINE_ICONS
            });
            browser.browserAction.setTitle({
                title: _("listTooltipOffline")
            });
        }
    }

    _updateChannel(channel) {
        if(channel.live.state == LiveState.OFFLINE) {
            this._unregisterChannel(channel.id);
        }
        else {
            this._registerChannel(channel);
        }
        this.updateBadge();
    }

    _registerChannel(channel) {
        if(channel.live.state == LiveState.LIVE) {
            if(this.nonlive.has(channel.id)) {
                this.nonlive.delete(channel.id);
            }
            this.live.add(channel.id);
        }
        else {
            if(this.live.has(channel.id)) {
                this.live.delete(channel.id);
            }
            this.nonlive.add(channel.id);
        }
    }

    _unregisterChannel(channelId) {
        if(this.live.has(channelId)) {
            this.live.delete(channelId);
        }
        else if(this.nonlive.has(channelId)) {
            this.nonlive.delete(channelId);
        }

        if(this.live.size === 0 && (!this.countNonlive || this.nonlive.size === 0)) {
            this.liveState = false;
        }
    }

    /**
     * Indicates the live state over all channels.
     *
     * @memberof module:list.ListView
     * @type {boolean}
     */
    get liveState() {
        return this._liveState;
    }
    set liveState(val) {
        this._liveState = val;
        if(!val) {
            this.live.clear();
            this.updateBadge();
        }
    }

    /**
     * Set the style of the list.
     *
     * @param {module:list~Style} style - Style to set.
     * @returns {undefined}
     */
    setStyle(style = this._style) {
        this._style = style;
        this._emitToList("setStyle", style);
    }

    /**
     * Set the visibility of the extras.
     *
     * @param {boolean} visible - Visibility of extras.
     * @returns {undefined}
     */
    setExtrasVisibility(visible = this._extras) {
        this._extras = visible;
        this._emitToList("setExtras", visible);
    }

    /**
     * Set the display type for non-live content.
     *
     * @param {module:list~NonLiveDisplay} style - Display mode of non-live content.
     * @returns {undefined}
     */
    setNonLiveDisplay(style = this.nonLiveDisplay) {
        this.nonLiveDisplay = style;
        this.updateBadge();
        if(this.nonlive.size > 0 && this.live.size === 0 && style < 2) {
            this.liveState = true;
        }

        this._emitToList("setNonLiveDisplay", style);
    }

    /**
     * Add channels to the list. Updates the live state.
     *
     * @param {Array.<module:channel/core.Channel>} channels - Channels to add.
     * @returns {undefined}
     */
    addChannels(channels) {
        if(channels.some((channel) => channel.live.isLive())) {
            this.liveState = true;
        }
        channels.forEach(this._updateChannel, this);
        this.updateBadge();
        this._emitToList("addChannels", channels.map((c) => c.serialize()));
    }
    /**
     * Remove a channel from the list. Updates the liveState if appropriate.
     *
     * @param {number} channelId - ID of the channel to remove.
     * @returns {undefined}
     */
    removeChannel(channelId) {
        this._unregisterChannel(channelId);
        this._emitToList("removeChannel", channelId);
    }
    /**
     * Mark a channel as live. Also updates the liveState. Can also be user to
     * update the info of a channel.
     *
     * @param {module:channel/core.Channel} channel - Channel to mark live.
     * @returns {undefined}
     */
    setChannelLive(channel) {
        this._updateChannel(channel);
        this._emitToList("setOnline", channel.serialize());
        this.liveState = true;
    }
    /**
     * Mark a channel as offline. Also updates liveState if appropriate.
     *
     * @param {module:channel/core.Channel} channel - Channel to mark offline.
     * @returns {undefined}
     */
    setChannelOffline(channel) {
        this._updateChannel(channel);
        this._emitToList("setOffline", channel.serialize());
    }

    /**
     * Mark a channel as in a distinct state that is not online or offline.
     *
     * @param {module:channel/core.Channel} channel - Channel to give a distinct
     *                                                state to.
     * @returns {undefined}
     */
    setChannelDistinct(channel) {
        this._updateChannel(channel);
        this._emitToList("setDistinct", channel.serialize());
    }

    /**
     * Set the available providers.
     *
     * @returns {undefined}
     */
    setProviders() {
        this._emitToList("setProviders", serializedProviders);
    }

    /**
     * Indicate if the update queue is running in the background or not.
     *
     * @param {boolean} [enabled] - If queue is enabled.
     * @returns {undefined}
     */
    setQueueStatus(enabled = this._queueStatus) {
        this._queueStatus = enabled;
        this._emitToList("queueStatus", enabled);
    }

    /**
     * Indicate if the queue is temporarily paused.
     *
     * @param {boolean} paused - If queue is paused.
     * @returns {undefined}
     */
    setQueuePaused(paused) {
        this._emitToList("queuePaused", paused);
    }

    /**
     * Set the theme.
     *
     * @param {number} [theme] - Theme type.
     * @returns {undefined}
     */
    setTheme(theme = this._theme) {
        this._theme = theme;
        this._emitToList("theme", theme);
    }

    /**
     * Something with the channel changed. Performs appropriate actions based on the
     * state of the channel. Updates liveState if appropriate.
     *
     * @param {module:channel/core.Channel} channel - Channel that changed.
     * @returns {undefined}
     */
    onChannelChanged(channel) {
        if(channel.live.state > 0 && this.nonLiveDisplay === ListView.LIVE_DISTINCT) {
            this.setChannelDistinct(channel);
        }
        else if(channel.live.isLive()) {
            this.setChannelLive(channel);
        }
        else {
            this.setChannelOffline(channel);
        }
    }

    setFeatured(channels, type, q = null) {
        this._emitToList("setFeatured", { channels, type, q });
    }

    copyChannelURL(string, external = false) {
        const command = external ? "copyexternal" : "copy";
        this.port.reply(command, string);
    }
}

export default ListView;
