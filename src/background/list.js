/**
 * Model for the Panel.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module list
 * @requires module:channel/utils
 * @requires module:list/firefox
 * @todo need to know badge stuff when constructed, not when popup opened (i.e rewrite that now with the list having its own db connection to load).
 */
// setup event handling
import { emit } from "../utils";
import prefs from "../preferences";
import LiveState from "./channel/live-state";
import providers from './providers';
import EventTarget from 'event-target-shim';
import Port from '../port';
import serializedProviders from "./providers/serialized";
import { errorStateManager } from './error-state';
import { formatChannels } from './channel/utils';

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

const LIVE_ICONS = "assets/images/icon.svg",
    OFFLINE_ICONS = "assets/images/offline.svg",
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
        this._queuePaused = false;
        this.live = new Set();
        this.nonlive = new Set();

        this.port = new Port("list");
        this.port.addEventListener("message", ({ detail: event }) => {
            switch(event.command) {
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
            case "copied":
            case "remove":
            case "open":
                emit(this, event.command, event.payload);
                break;
            case "configure":
                emit(this, "opencm");
                break;
            case "add":
                emit(this, "addchannel", event.payload.login, event.payload.type);
                break;
            case "pause":
            case "resume":
                emit(this, event.command);
                break;
            case "ready":
                this.ready = true;
                this.setNonLiveDisplay();
                this.setQueueStatus();
                this.setQueuePaused();
                this.setProviders();
                break;
            case "search":
                providers[event.payload.type].search(event.payload.query)
                    .then((channels) => formatChannels(channels, true))
                    .then((channels) => this.setFeatured(channels, event.payload.type, event.payload.query),
                        () => this.setFeatured([], event.payload.type, event.payload.query));
                break;
            case "explore":
                if(event.payload) {
                    providers[event.payload].getFeaturedChannels()
                        .then((channels) => formatChannels(channels, true))
                        .then((channels) => this.setFeatured(channels, event.payload),
                            () => this.setFeatured([], event.payload));
                }
                break;
            default:
                // Nothing to do here.
            }
        }, {
            passive: true,
            capture: false
        });

        prefs.addEventListener("change", ({ detail: event }) => {
            if(event.pref == "panel_badge") {
                this.updateBadge();
            }
        }, {
            passive: true,
            capture: false
        });
    }

    _emitToList(event, data) {
        this.port.send(event, data);
    }

    get countNonlive() {
        return this.nonLiveDisplay < ListView.DISTINCT;
    }

    async updateBadge() {
        if(!(await errorStateManager.IN_ERROR_STATE)) {
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
        this._emitToList("addChannels", channels.map((c) => c.id));
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
    setQueuePaused(paused = this._queuePaused) {
        this._queuePaused = paused;
        this._emitToList("queuePaused", paused);
    }

    /**
     * Something with the channel changed. Performs appropriate actions based on the
     * state of the channel. Updates liveState if appropriate.
     *
     * @param {module:channel/core.Channel} channel - Channel that changed.
     * @returns {undefined}
     */
    onChannelChanged(channel) {
        if((this.nonLiveDisplay !== ListView.LIVE_DISTINCT && channel.live.isLive(LiveState.TOWARD_LIVE)) || (this.nonLiveDisplay === ListView.LIVE_DISTINCT && channel.live.isLive(LiveState.TOWARD_OFFLINE))) {
            this.liveState = true;
        }

        this._updateChannel(channel);
        this._emitToList("updateChannel", channel.id);
    }

    setFeatured(channels, type, q = null) {
        this._emitToList("setFeatured", { channels, type, q });
    }
}

export default ListView;
