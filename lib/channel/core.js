/**
 * Channel and User Objects
 * @author Martin Giger
 * @license MPL-2.0
 * @module channel/core
 */

"use strict";
const { window } = require("sdk/addon/window"),
      { Class: newClass } = require("sdk/core/heritage");
const { merge, omit } = require("sdk/util/object");

const ITEM_ARGS = [ "login", "type", "id" ];

const Item = newClass(
/** @lends module:channel/core~Item.prototype */
{
    /**
     * A generic thing.
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     */
     initialize(login, type, id) {
        this._login = login;
        this._type = type;
        this.image = {};
        if(id)
            this.id = id;
    },
    _uname: "",
    _login: "",
    _type: "",
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
    },
    set uname(val) {
        if(val)
            this._uname = val;
    },
    /**
     * The login name of the user, this should be a unique string or number within
     * the provider.
     * @type {string|number}
     * @readonly
     */
    get login() {
        return this._login;
    },
    /**
     * An object with user avatars, by their size in pixels as property name.
     * @type {Object.<(string|number),string>}
     */
    image: {},
    /**
     * The provider type this user is from.
     * @type {string}
     * @readonly
     */
    get type() {
        return this._type;
    },
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
    },

    /**
     * @return {string} The human-readable name of the user with the first letter capitalized.
     */
    toString() {
        return this.uname.charAt(0).toUpperCase() + this.uname.slice(1);
    },
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
});

const User = newClass(
/** @lends module:channel/core.User.prototype */
{
    implements: [Item],
    /**
     * A generic user
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     * @extends module:channel/core~Item
     */
    initialize(login, type, id) {
        Item.prototype.initialize.call(this, login, type, id);
        this.favorites = [];
    },
    // properties
    /**
     * The favorite channels of this user as an array of logins.
     * @type {Array.<string>}
     */
    favorites: [],
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
        return Object.assign(Item.prototype.serialize.call(this), {
            favorites: this.favorites
        });
    }
});

exports.User = User;

const Channel = newClass(
/** @lends module:channel/core.Channel.prototype */
{
    implements: [Item],
    /**
     * A generic Channel object
     * @constructs
     * @argument {string} login
     * @argument {string} type
     * @argument {number} [id]
     * @extends module:channel/core~Item
     */
    initialize(login, type, id) {
        Item.prototype.initialize.call(this, login, type, id);
        // init all the arrays, so they aren't global for all objects
        this.url = [];

        this.lastModified = Date.now();
    },
    // properties
    /**
     * Indicates if the channel is live.
     * @type {boolean}
     * @default false
     */
    live: false,
    /**
     * The title of the live broadcast
     * @type {string}
     * @default ''
     */
    title: '',
    /**
     * The number of viewers of the live broadcast, -1 if unknown.
     * @type {number}
     * @default -1
     */
    viewers: -1,
    /**
     * Thumbnail of the live broadcast. Typically displayed at a width of 320px.
     * @type {string}
     * @default ''
     */
    thumbnail: '',
    /**
     * An array of URLs that will contain a player of the stream. The first one is
     * treated as the main channel page and opened when the user clicks on the
     * stream.
     * @type {Array.<string>}
     */
    url: [],
    /**
     * A URL pointing to a page listing past broadcasts. Opened when clicked on the
     * channel while offline.
     * @type {string}
     * @default ''
     */
    archiveUrl: '',
    /**
     * A URL to a page containing only the chat for a broadcast.
     * @type {string}
     * @default ''
     */
    chatUrl: '',
    /**
     * A UNIX timestamp, automatically set by the ChannelList.
     * @type {number}
     * @readonly
     * @default Date.now()
     */
    lastModified: 0,
    /**
     * The category of the live broadcast if known.
     * @type {string}
     * @default ''
     */
    category: '',
    /**
     * An Android Intent URI to watch the broadcast.
     * @type {string}
     * @default ''
     */
    intent: '',
    /**
     * If the channel's content is rated mature. Only true if the content rating
     * is known and it is for mature audiences.
     * @type {boolean}
     * @default false
     */
    mature: false,
    /**
     * Serialized version of {@link module:channel/core.Channel}
     * @typedef {module:channel/core~SerializedItem} SerializedChannel
     * @property {boolean} live
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
     */
    /**
     * Serialize the item into a normal object
     * @return {module:channel/core~SerializedChannel} A serialized version of
     *         this channel
     */
    serialize() {
        return Object.assign(Item.prototype.serialize.call(this), {
            live: this.live,
            title: this.title,
            viewers: this.viewers,
            thumbnail: this.thumbnail,
            url: this.url,
            archiveUrl: this.archiveUrl,
            chatUrl: this.chatUrl,
            lastModified: this.lastModified,
            category: this.category,
            intent: this.intent,
            mature: this.mature
        });
    }
});

exports.Channel = Channel;

/**
 * Deserializes an object into a Channel or User.
 * @exported
 * @argument {module:channel/core~SerializedChannel|module:channel/core~SerializedUser} properties
 * @argument {boolean} [notUser = false]
 * @return {module:channel/core.Channel|module:channel/core.User}
 */
const deserialize = (properties, notUser = false) => {
    let props = omit(properties, ITEM_ARGS);
    props._uname = properties.uname;
    if("favorites" in properties && !notUser) {
        return merge(new User(...ITEM_ARGS.map((a) => properties[a])), props);
    }
    else {
        return merge(new Channel(...ITEM_ARGS.map((a) => properties[a])), props);
    }
};
exports.deserialize = deserialize;

