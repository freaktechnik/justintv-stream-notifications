/**
 * Represents information for non-live streams.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/live-state
 */
import { omit } from "lodash";
import prefs from "../../preferences";
import LiveStateConst from '../../live-state.json';

/**
 * @typedef {number} LiveStateIndicator
 */
/**
 * @typedef {Object} SerializedLiveState
 * @property {module:channel/live-state~LiveStateIndicator} state
 * @property {module:channel/core~SerializedChannel} alternateChannel
 * @see {@link module:channel/live-state.LiveState}
 */
/**
 * Constant for how the live state is to be interpreted in a boolean scenario.
 *
 * @typedef {number} LiveStateInterpretation
 */

const IGNORED_PROPERTIES = [
        "state",
        "isLive",
        "alternateUsername",
        "alternateURL"
    ],
    {
        OFFLINE,
        LIVE,
        REDIRECT,
        REBROADCAST,
        TOWARD_LIVE,
        TOWARD_OFFLINE,
        TOWARD_BROADCASTING
    } = LiveStateConst,
    NONLIVE_OFFLINE = 2,
    getDefaultInterpretation = () => prefs.get("panel_nonlive").then((value) => value < NONLIVE_OFFLINE ? TOWARD_LIVE : TOWARD_OFFLINE);

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
     * Interprets everything where the channels itself is broadcasting as live
     * (thus rebroadcasts are live, redirects are not).
     *
     * @type {module:channel/live-state~LiveStateInterpretation}
     * @default 2
     * @const
     */
    static get TOWARD_BROADCASTING() {
        return TOWARD_BROADCASTING;
    }

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

    /**
     * @constructs
     * @param {module:channel/live-state~LiveStateIndicator} [state={@link module:channel/live-state.LiveState.OFFLINE}]
     *                                   - Initial state, defaulting to offline.
     */
    constructor(state = OFFLINE) {
        this._state = state;
        this.alternateChannel = undefined;
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
     * @returns {module:channel/live-state~LiveStateInterpretation} Default live
     *          state interpretation mode as per the visibility pref.
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
            alternateChannel: this.alternateChannel
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
        if(interpretation === undefined) {
            interpretation = await getDefaultInterpretation();
        }

        if(interpretation === TOWARD_LIVE) {
            return this.state !== OFFLINE;
        }
        else if(interpretation === TOWARD_OFFLINE) {
            return this.state === LIVE;
        }
        else if(interpretation === TOWARD_BROADCASTING) {
            return this.state === LIVE || this.state === REBROADCAST;
        }
        return false;
    }
    /**
     * Set the state to live or not live. Simple as can be.
     *
     * @param {boolean} live - Shortcut to set the object to simple states.
     * @returns {undefined}
     */
    setLive(live) {
        this._state = live ? LIVE : OFFLINE;
        this.alternateChannel = undefined;
    }

    /**
     * Redirect to a channel.
     *
     * @param {module:channel/core.Channel} channel - The channel to redirect to.
     * @returns {undefined}
     */
    redirectTo(channel) {
        this._state = REDIRECT;
        this.alternateChannel = channel.serialize();
    }

    get alternateUsername() {
        if(this.alternateChannel) {
            return this.alternateChannel.uname;
        }
        return "";
    }

    get alternateURL() {
        if(this.alternateChannel) {
            const FIRST_ELEMENT = 0;
            return this.alternateChannel.url[FIRST_ELEMENT];
        }
        return "";
    }
}

export default LiveState;
