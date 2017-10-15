/**
 * Channel and User Objects.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/core
 */
import { omit } from "lodash";
import LiveState from "./live-state";
import { capitalize } from '../../utils';

const ITEM_ARGS = [
        "login",
        "type",
        "id",
        "live"
    ],
    NO_VIEWERS = -1;

/**
 * A generic thing.
 * @class
 */
class Item {
    /**
     * @param {string} login - Unique login name.
     * @param {string} type - Provider name.
     * @param {number} [id] - Extension internal ID if already known.
     */
    constructor(login, type, id) {
        this._login = login;
        this._type = type;
        /**
         * An object with user avatars, by their size in pixels as property name.
         * @type {Object.<(string|number)>}
         */
        this.image = {};
        if(id) {
            this.id = id;
        }
    }
    /**
     * The human-readable name of the user.
     *
     * @type {string}
     * @default Value of {@link module:channel/core~Item#login}
     */
    get uname() {
        if(this._uname !== "") {
            return this._uname;
        }

        return this.login;
    }
    set uname(val) {
        if(val) {
            this._uname = val;
        }
    }
    /**
     * The login name of the user, this should be a unique string or number within
     * the provider.
     *
     * @type {string|number}
     * @readonly
     */
    get login() {
        return this._login;
    }
    /**
     * The provider type this user is from.
     *
     * @type {string}
     * @readonly
     */
    get type() {
        return this._type;
    }

    _uname = "";
    //methods
    /**
     * Retuns the URL to the best image for displaying at the specified size.
     *
     * @param {string|number} size - The size the image will be displayed in in pixels.
     * @returns {string} An URL to an image.
     */
    getBestImageForSize(size) {
        size = Math.round(parseInt(size, 10) * window.devicePixelRatio);
        // shortcut if there's an image with the size demanded
        if(this.image.hasOwnProperty(size.toString())) {
            return this.image[size];
        }

        // search next biggest image
        let index = Number.MAX_VALUE,
            biggest = 0;
        for(const s in this.image) {
            const ints = parseInt(s, 10);
            if(ints >= size && ints < index) {
                index = ints;
            }
            if(s > biggest) {
                biggest = ints;
            }
        }

        if(index > biggest) {
            index = biggest;
        }

        return this.image[index];
    }

    /**
     * @returns {string} The human-readable name of the user with the first
     *          letter capitalized.
     */
    toString() {
        return capitalize(this.uname);
    }
    /**
     * Serialized version of {@link module:channel/core~Item}
     *
     * @typedef {Object} SerializedItem
     * @property {string} uname
     * @property {string} login
     * @property {Object.<(string|number),string>} image
     * @property {string} type
     * @property {number} [id]
     */

    /**
     * Serialize the item into a normal object.
     *
     * @returns {module:channel/core~SerializedItem} A JSON serializable version
     *          of this item.
     */
    serialize() {
        const obj = {
            uname: this.uname,
            login: this.login,
            image: this.image,
            type: this.type
        };
        if(this.id) {
            obj.id = this.id;
        }
        return obj;
    }
}

/**
 * A generic user.
 *
 * @extends module:channel/core~Item
 */
class User extends Item {
    /**
     * @param {module:channel/core~SerializedUser} properties - Serialized object
     *        to turn into a user.
     * @returns {module:channel/core.User} User based on the serialized object.
     */
    static deserialize(properties) {
        const props = omit(properties, ITEM_ARGS);
        props._uname = properties.uname;
        return Object.assign(new User(...ITEM_ARGS.map((a) => properties[a])), props);
    }

    /**
     * @param {string} login - Login of the user.
     * @param {string} type - Type/Provider of the user.
     * @param {number} [id] - ID of the user.
     */
    constructor(login, type, id) {
        super(login, type, id);

        /**
         * The favorite channels of this user as an array of logins.
         * @type {[string]}
         */
        this.favorites = [];
    }
    /**
     * Serialized version of {@link module:channel/core.User}.
     *
     * @typedef {module:channel/core~SerializedItem} SerializedUser
     * @property {[string]} favorites
     */
    /**
     * Serialize the user into a normal object.
     *
     * @returns {module:channel/core~SerializedUser} A JSON serializable version
     *          of this user.
     */
    serialize() {
        return Object.assign(super.serialize(), {
            favorites: this.favorites
        });
    }
}

/**
 * A generic Channel object.
 *
 * @extends module:channel/core~Item
 */
class Channel extends Item {
    /**
     * @param {module:channel/core~SerializedChannel} properties - Serialzed object
     *        to deserialize into a channel.
     * @returns {module:channel/core.Channel} Deserialized channel based on the
     *          object.
     */
    static deserialize(properties) {
        const props = omit(properties, ITEM_ARGS);
        props._uname = properties.uname;
        return Object.assign(new Channel(...ITEM_ARGS.map((a) => properties[a])), props);
    }

    /**
     * @param {string} login - Login of the channel.
     * @param {string} type - Type/Provider of the channel.
     * @param {number} [id] - ID of the channel.
     * @param {module:channel/live-state~SerializedLiveState} [state] - Live state
     *        of the channel.
     */
    constructor(login, type, id, state) {
        super(login, type, id);

        /**
         * An array of URLs that will contain a player of the stream. The first one is
         * treated as the main channel page and opened when the user clicks on the
         * stream.
         * @type {[string]}
         */
        this.url = [];

        this.lastModified = Date.now();
        if(state) {
            this.live = LiveState.deserialize(state);
        }
        else {
            this.live = new LiveState();
        }
    }
    // properties
    /**
     * The title of the live broadcast.
     *
     * @type {string}
     * @default ''
     */
    title = '';
    /**
     * The number of viewers of the live broadcast, -1 if unknown.
     *
     * @type {number}
     * @default -1
     */
    viewers = NO_VIEWERS;
    /**
     * Thumbnail of the live broadcast. Typically displayed at a width of 320px.
     *
     * @type {string}
     * @default ''
     */
    thumbnail = '';
    /**
     * A URL pointing to a page listing past broadcasts. Opened when clicked on the
     * channel while offline.
     *
     * @type {string}
     * @default ''
     */
    archiveUrl = '';
    /**
     * A URL to a page containing only the chat for a broadcast.
     *
     * @type {string}
     * @default ''
     */
    chatUrl = '';
    /**
     * A UNIX timestamp, automatically set by the ChannelList.
     *
     * @type {number}
     * @readonly
     * @default Date.now()
     */
    lastModified = Date.now();
    /**
     * The category of the live broadcast if known.
     *
     * @type {string}
     * @default ''
     */
    category = '';
    /**
     * If the channel's content is rated mature. Only true if the content rating
     * is known and it is for mature audiences.
     *
     * @type {boolean}
     * @default false
     */
    mature = false;
    /**
     * @type {module:channel/live-state.LiveState}
     * @default null
     */
    get live() {
        return this._live;
    }
    set live(val) {
        if(val instanceof LiveState) {
            this._live = val;
        }
        else {
            throw new TypeError("Trying to set the live state to something that isn't a LiveState");
        }
    }
    /**
     * Serialized version of {@link module:channel/core.Channel}.
     *
     * @typedef {module:channel/core~SerializedItem} SerializedChannel
     * @property {string} title
     * @property {number} viewers
     * @property {string} thumbnail
     * @property {[string]} url
     * @property {string} archiveUrl
     * @property {string} chatUrl
     * @property {number} lastModified
     * @property {string} category
     * @property {string} intent
     * @proeprty {boolean} mature
     * @property {module:channel/live-state~SerializedLiveState} live
     */
    /**
     * Serialize the item into a normal object.
     *
     * @returns {module:channel/core~SerializedChannel} A JSON serializable
     *          version of this channel.
     */
    serialize() {
        return Object.assign(super.serialize(), {
            title: this.title,
            viewers: this.viewers,
            thumbnail: this.thumbnail,
            url: this.url,
            archiveUrl: this.archiveUrl,
            chatUrl: this.chatUrl,
            lastModified: this.lastModified,
            category: this.category,
            mature: this.mature,
            live: this.live.serialize()
        });
    }
}

export { Channel, User };
