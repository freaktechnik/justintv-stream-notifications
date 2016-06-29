/**
 * Model for the Panel
 * @author Martin Giger
 * @license MPL-2.0
 * @module list
 * @requires module:channel/utils
 * @requires module:list/firefox
 * @todo coutner badge vs. live state handling change
 */

"use strict";

// setup event handling
import { emit } from "sdk/event/core";
import EventTarget from "../event-target";
import PanelList from "./firefox";

/**
 * Should open the ChannelsManager.
 * @event module:list.ListView#opencm
 */
/**
 * Passes two arguments: type and login of the channel to add.
 * @event module:list.ListView#addchannel
 */
/**
 * The user triggered a manual refresh from the list. Optionally holds the ID of
 * the channel to update, else all channels are to be updated.
 * @event module:list.ListView#refresh
 * @type {number?}
 */
/**
 * The user wishes to open the a channel by approriate means. The second
 * parameter specifies the means, like the "what" parameter of
 * {@link module:channel/utils.selectOrOpenTab}.
 * @event module:list.ListView#open
 * @type {number}
 */
/**
 * The user wishes to pause the update queue.
 * @event module:list.ListView#pause
 */
/**
 * The user wishes to resume the update queue.
 * @event module:list.ListView#resume
 */
/**
 * The list is ready for modifications.
 * @event module:list.ListView#ready
 */
/**
 * @typedef Style
 * @type {number}
 */
/**
 * @typedef {number} NonLiveDisplay
 */
/**
 * @typedef {Object} ListOptions
 * @property {module:list~NonLiveDisplay} nonLiveDisplay
 * @property {function} [onOpencm] - Event listener for {@link module:list.ListView#events:opencm}
 * @property {function} [onAddchannel] - Event listener for {@link module:list.ListView#events:addchannel}
 * @property {function} [onRefresh] - Event listener for {@link module:list.ListView#events:refresh}
 * @property {function} [onOpen] - Event listener for {@link module:list.ListView#events:open}
 * @property {function} [onPause] - Event listener for {@link module:list.ListView#events:pause}
 * @property {function} [onResume] - Event listener for {@link module:list.ListView#events:resume}
 * @property {function} [onReady] - Event listener for {@link module:list.ListView#events:ready}
 */
/**
 * @class moudle:list.ListView
 * @extends module:event-target.EventTarget
 */
class ListView extends EventTarget {
    /**
     * @constructor
     * @argument {boolean} live - Initial live state.
     * @argument {module:list~Style} style - Initial panel style.
     * @argument {boolean} extras - Initial visibility of extras.
     * @argument {Object.<module:providers/generic-provider.GenericProvider>} providers
     * @argument {module:list~ListOptions} options - Event listeners and new
     *                                               constructor arguments.
     * @fires module:list.ListView#opencm
     * @fires module:list.ListView#addchannel
     * @fires module:list.ListView#ready
     * @fires module:list.ListView#open
     * @fires module:list.ListView#refresh
     * @fires module:list.ListView#pause
     * @fires module:list.ListView#resume
     * @alias module:list.ListView
     */
    constructor(live, style, extras, providers, options) {
        super(options);
        this._liveState = live;

        this.ready = false;
        this.list = new PanelList(live, style, extras, options.nonLiveDisplay);
        this.nonLiveDisplay = options.nonLiveDisplay;

        this.list.on("offline", () => { this.liveState = false; });
        this.list.on("open", (channelId, what) => emit(this, "open", channelId, what));
        this.list.on("refresh", (channelId) => emit(this, "refresh", channelId));
        this.list.on("configure", () => emit(this, "opencm"));
        this.list.on("add", (type, login) => emit(this, "addchannel", type, login));
        this.list.on("pause", () => emit(this, "pause"));
        this.list.on("resume", () => emit(this, "resume"));

        this.list.on("explore", (type) => {
            providers[type].getFeaturedChannels()
                .then((channels) => this.list.setFeatured(channels.map((c) => c.serialize()), type),
                      () => this.list.setFeatured([], type));
        });

        this.list.on("search", (type, q) => {
            providers[type].search(q)
                .then((channels) => this.list.setFeatured(channels.map((c) => c.serialize()), type, q),
                      () => this.list.setFeatured([], type, q));
        });

        this.list.on("ready", () => {
            this.ready = true;
            emit(this, "ready");
        });
    }

    /**
     * Indicates the live state over all channels.
     * @memberof module:list.ListView
     * @type {boolean}
     */
    get liveState() {
        return this._liveState;
    }
    set liveState(val) {
        this._liveState = val;
        this.list.setLiveState(val);
    }

    /**
     * Set the style of the list.
     * @argument {module:list~Style} style
     */
    setStyle(style) {
        this.list.setStyle(style);
    }

    /**
     * Set the visibility of the extras.
     * @argument {boolean} visible
     */
    setExtrasVisibility(visible) {
        this.list.setExtras(visible);
    }

    /**
     * Set the display type for non-live content.
     * @argument {module:list~NonLiveDisplay} style
     */
    setNonLiveDisplay(style) {
        this.nonLiveDisplay = style;
        this.list.setNonLiveDisplay(style);
    }

    /**
     * Add channels to the list. Updates the live state.
     * @argument {Array.<module:channel/core.Channel>} channels
     */
    addChannels(channels) {
        if(channels.some((channel) => channel.live.isLive()))
            this.liveState = true;
        this.list.addChannels(channels.map((c) => c.serialize()));
    }
    /**
     * Remove a channel from the list. Updates the liveState if appropriate.
     * @argument {number} channelId - ID of the channel to remove.
     */
    removeChannel(channelId) {
        this.list.removeChannel(channelId);
    }
    /**
     * Mark a channel as live. Also updates the liveState. Can also be user to
     * update the info of a channel.
     * @argument {module:channel/core.Channel} channel
     */
    setChannelLive(channel) {
        this.list.setOnline(channel.serialize());
        this.liveState = true;
    }
    /**
     * Mark a channel as offline. Also updates liveState if appropriate.
     * @argument {module:channel/core.Channel} channel
     */
    setChannelOffline(channel) {
        this.list.setOffline(channel.serialize());
    }

    /**
     * Mark a channel as in a distinct state that is not online or offline.
     * @argument {module:channel/core.Channel} channel
     */
    setChannelDistinct(channel) {
        this.list.setDistinct(channel.serialize());
    }

    /**
     * Set the available providers.
     * @argument {Object.<module:providers/generic-provider.GenericProvider>} serializedProviders
     */
    setProviders(serializedProviders) {
        this.list.setProviders(serializedProviders);
    }

    /**
     * Indicate if the update queue is running in the background or not.
     */
    setQueueStatus(enabled) {
        this.list.setQueueStatus(enabled);
    }

    /**
     * Indicate if the queue is temporarily paused.
     */
    setQueuePaused(paused) {
        this.list.setQueuePaused(paused);
    }

    /**
     * Something with the channel changed. Performs appropriate actions based on the
     * state of the channel. Updates liveState if appropriate.
     * @argument {module:channel/core.Channel} channel
     */
    onChannelChanged(channel) {
        console.log("updating state for", channel.login);
        if(channel.live.state > 0 && this.nonLiveDisplay === ListView.LIVE_DISTINCT)
            this.setChannelDistinct(channel);
        else if(channel.live.isLive())
            this.setChannelLive(channel);
        else
            this.setChannelOffline(channel);
    }
}

/**
 * @const {module:list~Style}
 * @default 0
 */
ListView.STYLE_COMPACT = 0;
/**
 * @const {module:list~Style}
 * @default 1
 */
ListView.STYLE_NORMAL = 1;
/**
 * @const {module:list~Style}
 * @default 2
 */
ListView.STYLE_THUMBNAIL = 2;

/**
 * Display non-live channels as live.
 * @const {module:list~NonLiveDisplay}
 * @default 0
 */
ListView.LIVE = 0;
/**
 * Display non-live channels as live but sort them to the bottom if possible.
 * @const {module:list~NonLiveDisplay}
 * @default 1
 */
ListView.LIVE_BOTTOM = 1;
/**
 * Display non-live channels in their own category.
 * @const {module:list~NonLiveDisplay
 * @default 2
 */
ListView.DISTINCT = 2;
/**
 * Display non-live channels as offline (ignore their liveness). This is handled
 * directly in this module, so the channel gets passed as going offline.
 * @const {module:list~NonLiveDisplay}
 * @default 3
 */
ListView.OFFLINE = 3;

export default ListView;
