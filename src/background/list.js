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
import EventTarget from '../event-target';

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
        "16": "images/icon16.png",
        "18": "images/icon18.png",
        "32": "images/icon32.png",
        "36": "images/icon36.png",
        "48": "images/icon48.png",
        "64": "images/icon64.png"
    },
    OFFLINE_ICONS = {
        "16": "images/offline16.png",
        "18": "images/offline18.png",
        "32": "images/offline32.png",
        "36": "images/offline36.png",
        "48": "images/offline48.png",
        "64": "images/offline64.png"
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
    port = null;
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

        browser.runtime.onConnect.addListener((port) => {
            if(port.name == "list") {
                this._setupPort(port);
            }
        });

        prefs.addEventListener("change", (event) => {
            if(event.pref == "panel_badge") {
                this.updateBadge();
            }
        }, { passive: false });
    }

    _setupPort(port) {
        this.port = port;

        this.setNonLiveDisplay();
        this.port.onMessage.addListener((event) => {
            if(event.target == "openUrl") {
                emit(this, "open", event.channelId);
            }
            else if(event.target == "openChat") {
                emit(this, "open", event.channelId, "chat");
            }
            else if(event.target == "openArchive") {
                emit(this, "open", event.channelId, "archive");
            }
            else if(event.target == "refresh") {
                emit(this, "refresh", event.channelId);
            }
            else if(event.target == "configure") {
                emit(this, "opencm");
            }
            else if(event.target == "add") {
                emit(this, "addchannel", event.type, event.login);
            }
            else if(event.target == "pause") {
                emit(this, "pause");
            }
            else if(event.target == "resume") {
                emit(this, "resume");
            }
            else if(event.target == "ready") {
                this.ready = true;
                emit(this, "ready");
            }
            else if(event.target == "search") {
                providers[event.type].search(event.query)
                    .then((channels) => this.setFeatured(channels.map((c) => c.serialize()), event.type, event.query),
                          () => this.setFeatured([], event.type, event.query));
            }
            else if(event.target == "explore") {
                providers[event.type].getFeaturedChannels()
                    .then((channels) => this.setFeatured(channels.map((c) => c.serialize()), event.type),
                          () => this.setFeatured([], event.type));
            }
            else if(event.target == "copy") {
                emit(this, "copy", event.channelId);
            }
            else if(event.target == "copyexternal") {
                emit(this, "copy", event.login, event.type);
            }
            else if(event.target == "removedLive") {
                this._unregisterChannel(event.channelId);
            }
        });

        this.port.onDisconnect.addListener(() => {
            this.port = null;
        });
    }

    _emitToList(event, data) {
        if(this.port) {
            this.port.postMessage({
                target: event,
                data
            });
        }
    }

    get countNonlive() {
        return this.nonLiveDisplay < ListView.DISTINCT;
    }

    async updateBadge() {
        const size = this.live.size + (this.countNonlive ? this.nonlive.size : 0);
        if(size > 0) {
            if(await prefs.get("panel_badge")) {
                browser.browserAction.setBadgeText({
                    text: size
                });
            }
            else {
                browser.browserAction.setBadgeText({
                    text: ""
                });
            }

            browser.browserAction.setIcon({
                imageData: LIVE_ICONS
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
                imageData: OFFLINE_ICONS
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
     */
    setStyle(style = this._style) {
        this._style = style;
        this._emitToList("setStyle", style);
    }

    /**
     * Set the visibility of the extras.
     *
     * @param {boolean} visible - Visibility of extras.
     */
    setExtrasVisibility(visible = this._extras) {
        this._extras = visible;
        this._emitToList("setExtras", visible);
    }

    /**
     * Set the display type for non-live content.
     *
     * @param {module:list~NonLiveDisplay} style - Display mode of non-live content.
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
     */
    setChannelDistinct(channel) {
        this._updateChannel(channel);
        this._emitToList("setDistinct", channel.serialize());
    }

    /**
     * Set the available providers.
     *
     * @param {Object.<module:providers/generic-provider.GenericProvider>} serializedProviders
     *                                                    - Available providers.
     */
    setProviders(serializedProviders) {
        this._emitToList("setProviders", serializedProviders);
    }

    /**
     * Indicate if the update queue is running in the background or not.
     *
     * @param {boolean} enabled - If queue is enabled.
     */
    setQueueStatus(enabled) {
        this._emitToList("queueStatus", enabled);
    }

    /**
     * Indicate if the queue is temporarily paused.
     *
     * @param {boolean} paused - If queue is paused.
     */
    setQueuePaused(paused) {
        this._emitToList("queuePaused", paused);
    }

    /**
     * Set the theme.
     *
     * @param {number} theme - Theme type.
     */
    setTheme(theme) {
        this._emitToList("theme", theme);
    }

    /**
     * Something with the channel changed. Performs appropriate actions based on the
     * state of the channel. Updates liveState if appropriate.
     *
     * @param {module:channel/core.Channel} channel - Channel that changed.
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
}

export default ListView;
