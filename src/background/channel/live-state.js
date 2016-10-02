/**
 * Represents information for non-live streams.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/live-state
 * @todo Replace alternate properties with a serialized channel (to avoid require loops)
 */
import { omit } from "underscore";
import prefs from "../preferences";

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
/**
 * Constant for how the live state is to be interpreted in a boolean scenario.
 *
 * @typedef {number} LiveStateInterpretation
 */

const IGNORED_PROPERTIES = [ "state", "isLive" ],
    OFFLINE = -1,
    LIVE = 0,
    REDIRECT = 1,
    REBROADCAST = 2,
    TOWARD_LIVE = 0,
    TOWARD_OFFLINE = 1,
    getDefaultInterpretation = () => {
        return prefs.get("panel_nonlive").then((value) => {
            return parseInt(value, 10) < 3 ? TOWARD_LIVE : TOWARD_OFFLINE;
        })
    }

/**
 * Used to describe the exact state of a stream. Sometimes streams are marked
 * as rebroadcasts or are a re-stream from a different source.
 *
 * @class module:channel/live-state.LiveState
 */
class LiveState {
    /**
     * Indicates that the channel is offline.
     *
     * @const
     * @type {module:channel/live-state~LiveStateIndicator}
     * @alias module:channel/live-state.LiveState.OFFLINE
     * @default 0
     * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.LIVE}
     */
    static OFFLINE = OFFLINE;
    /**
     * Indicates that the channel is live.
     *
     * @const
     * @type {module:channel/live-state~LiveStateIndicator}
     * @alias module:channel/live-state.LiveState.LIVE
     * @default 0
     * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
     */
    static LIVE = LIVE;
    /**
     * Indicates the channel is hosting another channel or similar.
     *
     * @const
     * @type {module:channel/live-state~LiveStateIndicator}
     * @alias module:channel/live-state.LiveState.REDIRECT
     * @default 1
     * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
     */
    static REDIRECT = REDIRECT;
    /**
     * The channel is rebroadcasting a previous broadcast.
     *
     * @const
     * @type {module:channel/live-state~LiveStateIndicator}
     * @alias module:channel/live-state.LiveState.REBROADCAST
     * @default 2
     * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.OFFLINE}
     */
    static REBROADCAST = REBROADCAST;

    /**
     * Interprets everything but offline as live.
     *
     * @type {module:channel/live-state~LiveStateInterpretation}
     * @default 0
     * @const
     */
    static TOWARD_LIVE = TOWARD_LIVE;
    /**
     * Interprets everything but live as offline.
     *
     * @type {module:channel/live-state~LiveStateInterpretation}
     * @default 1
     * @const
     */
    static TOWARD_OFFLINE = TOWARD_OFFLINE;

    /**
     * @param {module:channel/live-state~SerializedLiveState} serializedLiveState
     *                      - LiveState represented as JSON serializable object.
     * @returns {module:channel/live-state.LiveState} LiveState derrived from
     *          the specification of the serialized version.
     */
    static deserialize(serializedLiveState) {
        const props = omit(serializedLiveState, IGNORED_PROPERTIES);
        return Object.assign(new LiveState(serializedLiveState.state), props);
    }


    alternateUsername = "";
    alternateURL = "";

    /**
     * @constructs
     * @param {module:channel/live-state~LiveStateIndicator} [state={@link module:channel/live-state.LiveState.OFFLINE}]
     *                                   - Initial state, defaulting to offline.
     */
    constructor(state = OFFLINE) {
        this._state = state;
    }
    /**
     * The state descriptor of this LiveState.
     *
     * @type {module:channel/live-state~LiveStateIndicator}
     * @readonly
     */
    get state() {
        return this._state;
    }
    /**
     * The default interpretation mode based on a user's preference.
     *
     * @type {module:channel/live-state~LiveStateInterpretation}
     * @async
     */
    static defaultInterpretation() {
        return getDefaultInterpretation();
    }
    /**
     * Serialize the LiveState.
     *
     * @returns {module:channel/live-state~SerializedLiveState} JSON
     *          serializable object representation of the live state.
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
     * Interpret the live state to a boolean decision.
     *
     * @param {module:channel/live-state~LiveStateInterpretation} [interpretation]
     *                                - How to interpret live states as boolean.
     * @returns {boolean} Whether the live state should be considered live.
     */
    async isLive(interpretation) {
        if(!interpretation) {
            interpretation = await getDefaultInterpretation();
        }

        if(interpretation === TOWARD_LIVE) {
            return this.state !== OFFLINE;
        }
        else if(interpretation === TOWARD_OFFLINE) {
            return this.state === LIVE;
        }
    }
    /**
     * Set the state to live or not live. Simple as can be.
     *
     * @param {boolean} live - Shortcut to set the object to simple states.
     */
    setLive(live) {
        this._state = live ? LIVE : OFFLINE;
        this.alternateUsername = "";
        this.alternateURL = "";
    }
}

export default LiveState;
