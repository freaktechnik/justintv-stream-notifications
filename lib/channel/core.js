/**
 * Channel and User Objects
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/core
 */

"use strict";
import { window } from "sdk/addon/window";
import { merge, omit } from "sdk/util/object";
import LiveState from "./live-state";

const ITEM_ARGS = [ "login", "type", "id", "live" ];

/**
 * A generic thing.
 * @class module:channel/core~Item
 */
class Item {
    /**
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     */
     constructor(login, type, id) {
        this._login = login;
        this._uname = "";
        this._type = type;
        /**
         * An object with user avatars, by their size in pixels as property name.
         * @type {Object.<(string|number)>}
         */
        this.image = {};
        if(id)
            this.id = id;
    }
    /**
     * The human-readable name of the user.
     * @type {string}
     * @default Value of {@link module:channel/core~Item#login}
     */
    get uname() {
        if(this._uname !== "")
            return this._uname;
        else
            return this.login;
    }
    set uname(val) {
        if(val)
            this._uname = val;
    }
    /**
     * The login name of the user, this should be a unique string or number within
     * the provider.
     * @type {string|number}
     * @readonly
     */
    get login() {
        return this._login;
    }
    /**
     * The provider type this user is from.
     * @type {string}
     * @readonly
     */
    get type() {
        return this._type;
    }
    //methods
    /**
     * Retuns the URL to the best image for displaying at the specified size.
     * @argument {string|number} size - The size the image will be displayed in in pixels.
     * @return {string} An URL to an image
     */
    getBestImageForSize(size) {
        size = Math.round(parseInt(size, 10) * window.devicePixelRatio);
        // shortcut if there's an image with the size demanded
        if(this.image.hasOwnProperty(size.toString())) {
            return this.image[size];
        }

        // search next biggest image
        var index = Number.MAX_VALUE, biggest = 0;
        Object.keys(this.image).forEach(function(s) {
            s = parseInt(s, 10);
            if(s > size && s < index)
                index = s;
            if(s > biggest)
                biggest = s;
        });

        if(index > biggest)
            index = biggest;

        return this.image[index];
    }

    /**
     * @return {string} The human-readable name of the user with the first letter capitalized.
     */
    toString() {
        return this.uname.charAt(0).toUpperCase() + this.uname.slice(1);
    }
    /**
     * Serialized version of {@link module:channel/core~Item}
     * @typedef {Object} SerializedItem
     * @property {string} uname
     * @property {string} login
     * @property {Object.<(string|number),string>} image
     * @property {string} type
     * @property {number} [id]
     */

    /**
     * Serialize the item into a normal object
     * @return {module:channel/core~SerializedItem} A serialized version of this
     *         item
     */
    serialize() {
        let obj = {
            uname: this.uname,
            login: this.login,
            image: this.image,
            type: this.type
        };
        if(this.id)
            obj.id = this.id;
        return obj;
    }
}

/**
 * A generic user
 * @class module:channel/core.User
 */
class User extends Item
{
    /**
     * @static
     * @argument {module:channel/core~SerializedUser} properties
     * @return {module:channel/core.User}
     */
    static deserialize(properties) {
        let props = omit(properties, ITEM_ARGS);
        props._uname = properties.uname;
        return merge(new User(...ITEM_ARGS.map((a) => properties[a])), props);
    }

    /**
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     * @extends module:channel/core~Item
     */
    constructor(login, type, id) {
        super(login, type, id);

        /**
         * The favorite channels of this user as an array of logins.
         * @type {Array.<string>}
         */
        this.favorites = [];
    }
    /**
     * Serialized version of {@link module:channel/core.User}
     * @typedef {module:channel/core~SerializedItem} SerializedUser
     * @property {Array.<string>} favorites
     */
    /**
     * Serialize the user into a normal object
     * @return {module:channel/core~SerializedUser} A serialized version of this
     *         user
     */
    serialize() {
        return Object.assign(super.serialize(), {
            favorites: this.favorites
        });
    }
}

/**
 * A generic Channel object
 * @class module:channel/core.Channel
 */
class Channel extends Item {
    /**
     * @static
     * @argument {module:channel/core~SerializedChannel} properties
     * @return {module:channel/core.Channel}
     */
    static deserialize(properties) {
        let props = omit(properties, ITEM_ARGS);
        props._uname = properties.uname;
        return merge(new Channel(...ITEM_ARGS.map((a) => properties[a])), props);
    }

    /**
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     * @argument {module:channel/live-state~SerializedLiveState} [state]
     * @extends module:channel/core~Item
     */
    constructor(login, type, id, state) {
        super(login, type, id);

        /**
         * The title of the live broadcast
         * @type {string}
         * @default ''
         */
        this.title = '';
        /**
         * The number of viewers of the live broadcast, -1 if unknown.
         * @type {number}
         * @default -1
         */
        this.viewers = -1;
        /**
         * Thumbnail of the live broadcast. Typically displayed at a width of 320px.
         * @type {string}
         * @default ''
         */
        this.thumbnail = '';
        /**
         * An array of URLs that will contain a player of the stream. The first one is
         * treated as the main channel page and opened when the user clicks on the
         * stream.
         * @type {Array.<string>}
         */
        this.url = [];
        /**
         * A URL pointing to a page listing past broadcasts. Opened when clicked on the
         * channel while offline.
         * @type {string}
         * @default ''
         */
        this.archiveUrl = '';
        /**
         * A URL to a page containing only the chat for a broadcast.
         * @type {string}
         * @default ''
         */
        this.chatUrl = '';
        /**
         * A UNIX timestamp, automatically set by the ChannelList.
         * @type {number}
         * @readonly
         * @default Date.now()
         */
        this.lastModified = 0;
        /**
         * The category of the live broadcast if known.
         * @type {string}
         * @default ''
         */
        this.category = '';
        /**
         * An Android Intent URI to watch the broadcast.
         * @type {string}
         * @default ''
         */
        this.intent = '';
        /**
         * If the channel's content is rated mature. Only true if the content rating
         * is known and it is for mature audiences.
         * @type {boolean}
         * @default false
         */
        this.mature = false;

        this.lastModified = Date.now();
        if(state)
            this.live = LiveState.deserialize(state);
        else
            this.live = new LiveState();
    }
    // properties
    /**
     * @type {module:channel/live-state.LiveState}
     * @default null
     */
    get live() {
        return this._live;
    }
    set live(val) {
        if(val instanceof LiveState)
            this._live = val;
        else
            throw new TypeError("Trying to set the live state to something that isn't a LiveState");
    }
    /**
     * Serialized version of {@link module:channel/core.Channel}
     * @typedef {module:channel/core~SerializedItem} SerializedChannel
     * @property {string} title
     * @property {number} viewers
     * @property {string} thumbnail
     * @property {Array.<string>} url
     * @property {string} archiveUrl
     * @property {string} chatUrl
     * @property {number} lastModified
     * @property {string} category
     * @property {string} intent
     * @proeprty {boolean} mature
     * @property {module:channel/live-state~SerializedLiveState} live
     */
    /**
     * Serialize the item into a normal object
     * @return {module:channel/core~SerializedChannel} A serialized version of
     *         this channel
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
            intent: this.intent,
            mature: this.mature,
            live: this.live.serialize()
        });
    }
}

export { Channel, User };
