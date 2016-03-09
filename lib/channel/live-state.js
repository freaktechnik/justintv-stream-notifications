/**
 * Represents information for non-live streams.
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/live-state
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { merge, omit } = require("sdk/util/object");

const IGNORED_PROPERTIES = [ "state", "enabled" ];

/**
 * @typedef {number} LiveStateIndicator
 */
/**
 * @typedef {Object} SerializedLiveState
 * @property {module:channel/live-state~LiveStateIndicator} state
 * @property {boolean} enabled
 * @property {string} alternateUsername
 * @property {string} alternateURL
 * @see {@link module:channel/live-state.LiveState}
 */

const DISABLED = 0;
const REDIRECT = 1;
const REBROADCAST = 2;

const LiveState = newClass(
/** @lends module:channel/live-state.LiveState.prototype */
{
    /**
     * Used to describe the exact state of a stream. Sometimes streams are marked
     * as rebroadcasts or are a re-stream from a different source.
     * @constructs
     * @argument {module:channel/live-state~LiveStateIndicator} [state = {@link module:channel/live-state.LiveState.DISABLED}]
     */
    initialize(state = DISABLED) {
        this._state = state;
    },
    /**
     * The state descriptor of this LiveState.
     * @type {module:channel/live-state~LiveStateIndicator}
     * @readonly
     */
    get state() {
        return this._state;
    },
    /**
     * Indicates if the LiveState is in a special state.
     * @type {boolean}
     * @readonly
     */
    get enabled() {
        return this.state !== DISABLED;
    },
    alternateUsername: "",
    alternateURL: "",
    /**
     * Disable the LiveState, so reset its state to {@link module:channel/live-state.LiveState.DISABLED}.
     */
    disable() {
        this._state = DISABLED;
    },
    /**
     * Serialize the LiveState.
     * @return {module:channel/live-state~SerializedLiveState}
     */
    serialize() {
        return {
            state: this.state,
            enabled: this.enabled,
            alternateUsername: this.alternateUsername,
            alternateURL: this.alternateURL
        };
    }
});
/**
 * Indicates that the channel is in a regular state.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.DISABLED
 * @default 0
 * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}
 */
LiveState.DISABLED = DISABLED;
/**
 * Indicates the channel is hosting another channel or similar.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.REDIRECT
 * @default 1
 * @see {@link module:channel/live-state.LiveState.DISABLED}, {@link module:channel/live-state.LiveState.REBROADCAST}
 */
LiveState.REDIRECT = REDIRECT;
/**
 * The channel is rebroadcasting a previous broadcast.
 * @const
 * @type {module:channel/live-state~LiveStateIndicator}
 * @alias module:channel/live-state.LiveState.REBROADCAST
 * @default 2
 * @see {@link module:channel/live-state.LiveState.DISABLED}, {@link module:channel/live-state.LiveState.REDIRECT}
 */
LiveState.REBROADCAST = REBROADCAST;

/**
 * @alias module:channel/live-state.LiveState.deserialize
 * @argument {module:channel/live-state~SerializedLiveState} serializedLiveState
 * @return {module:channel/live-state.LiveState}
 */
LiveState.deserialize = (serializedLiveState) => {
    const props = omit(serializedLiveState, IGNORED_PROPERTIES);
    return merge(new LiveState(serializedLiveState.state), props);
};

exports.LiveState = LiveState;
