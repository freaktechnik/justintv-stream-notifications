/**
 * Represents information for non-live streams.
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/live-state
 * @todo Replace alternate properties with a serialized channel (to avoid require loops)
 */
"use strict";

const { merge, omit } = require("sdk/util/object");
const { prefs } = require("sdk/simple-prefs");

const IGNORED_PROPERTIES = [ "state", "isLive" ];

/**
 * @typedef {number} LiveStateIndicator
 */
/**
 * @typedef {Object} SerializedLiveState
 * @property {module:channel/live-state~LiveStateIndicator} state
 * @property {string} alternateUsername
 * @property {string} alternateURL
 * @see {@link module:channel/live-state.LiveState}
 */

const OFFLINE = -1;
const LIVE = 0;
const REDIRECT = 1;
const REBROADCAST = 2;

/**
 * Constant for how the live state is to be interpreted in a boolean scenario
 * @typedef {number} LiveStateInterpretation
 */
const TOWARD_LIVE = 0;
const TOWARD_OFFLINE = 1;

const getDefaultInterpretation = () => parseInt(prefs.panel_nonlive, 10) < 3 ? TOWARD_LIVE : TOWARD_OFFLINE;

/**
 * Used to describe the exact state of a stream. Sometimes streams are marked
 * as rebroadcasts or are a re-stream from a different source.
 * @class module:channel/live-state.LiveState
 */
class LiveState {
    /**
     * @argument {module:channel/live-state~SerializedLiveState} serializedLiveState
     * @return {module:channel/live-state.LiveState}
     */
    static deserialize(serializedLiveState) {
        const props = omit(serializedLiveState, IGNORED_PROPERTIES);
        return merge(new LiveState(serializedLiveState.state), props);
    }

    /**
     * @constructs
     * @argument {module:channel/live-state~LiveStateIndicator} [state = {@link module:channel/live-state.LiveState.OFFLINE}]
     */
    constructor(state = OFFLINE) {
        this._state = state;
        this.alternateUsername = "";
        this.alternateURL = "";
    }
    /**
     * The state descriptor of this LiveState.
     * @type {module:channel/live-state~LiveStateIndicator}
     * @readonly
     */
    get state() {
        return this._state;
    }
    /**
     * The default interpretation mode based on a user's preference.
     * @type {module:channel/live-state~LiveStateInterpretation}
     */
    get defaultInterpretation() {
        return getDefaultInterpretation();
    }
    /**
     * Serialize the LiveState.
     * @return {module:channel/live-state~SerializedLiveState}
     */
    serialize() {
        return {
            state: this.state,
            alternateUsername: this.alternateUsername,
            alternateURL: this.alternateURL,
            isLive: this.isLive()
        };
    }
    /**
     * Interpret the live state to a boolean decision
     * @argument {module:channel/live-state~LiveStateInterpretation} [interpretation]
     * @return {boolean}
     */
    isLive(interpretation = getDefaultInterpretation()) {
        if(interpretation === TOWARD_LIVE)
            return this.state !== OFFLINE;
        else if(interpretation === TOWARD_OFFLINE)
            return this.state === LIVE;
    }
    /**
     * Set the state to live or not live. Simple as can be.
     * @argument {boolean} isLive
     */
    setLive(live) {
        this._state = live ? LIVE : OFFLINE;
        this.alternateUsername = "";
        this.alternateURL = "";
    }
}
/**
 * Indicates that the channel is offline.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.OFFLINE
 * @default 0
 * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.LIVE}
 */
LiveState.OFFLINE = OFFLINE;
/**
 * Indicates that the channel is live.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.LIVE
 * @default 0
 * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
 */
LiveState.LIVE = LIVE;
/**
 * Indicates the channel is hosting another channel or similar.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.REDIRECT
 * @default 1
 * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
 */
LiveState.REDIRECT = REDIRECT;
/**
 * The channel is rebroadcasting a previous broadcast.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.REBROADCAST
 * @default 2
 * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.OFFLINE}
 */
LiveState.REBROADCAST = REBROADCAST;

LiveState.TOWARD_LIVE = TOWARD_LIVE;
LiveState.TOWARD_OFFLINE = TOWARD_OFFLINE;

exports.LiveState = LiveState;
