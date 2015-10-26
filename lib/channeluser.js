/**
 * Channel and User Objects
 * @author Martin Giger
 * @license MPL-2.0
 * @module channeluser
 */

"use strict";
const { window } = require("sdk/addon/window"),
      { URL } = require('sdk/url');

// properties
//User.prototype.id       = 0;
/**
 * The human-readable name of the user
 * @type {string}
 */
User.prototype.uname     = "";
/**
 * The login name of the user, this should be a unique string or number within
 * the provider.
 * @type {string|number}
 */
User.prototype.login     = "";
/**
 * An object with user avatars, by their size in pixels as property name.
 * @type {object.<string,string>}
 */
User.prototype.image     = {};
/**
 * The provider type this user is from.
 * @type {string}
 */
User.prototype.type      = "";
/**
 * The favorite channels of this user as an array of logins.
 * @type {Array.<string>}
 */
User.prototype.favorites = [];

/**
 * A generic user
 * @constructor module:channeluser.User
 */
function User(id) {
    this.image = {};
    this.favorites = [];
    if(id)
        this.id = id;
}

// methods

/**
 * Retuns the URL to the best image for displaying at the specified size.
 * @argument {string|number} size - The size the image will be displayed in in pixels.
 * @return {string} An URL to an image
 */
User.prototype.getBestImageForSize = function(size) {
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
};

/**
 * @return {string} The human-readable name of the user with the first letter capitalized.
 */
User.prototype.toString = function() {
    return this.uname.charAt(0).toUpperCase() + this.uname.slice(1);
};

exports.User = User;

/*
    Channel Object
    extends User
*/

// constructor
/**
 * A generic Channel object
 * @constructor module:channeluser.Channel
 * @extends module:channeluser.User
 */
function Channel(id) {
    User.call(this, id);
    // init all the arrays, so they aren't global for all objects
    this.url = [];

    this.lastModified = Date.now();
}

Channel.prototype = Object.create(User.prototype);
Channel.prototype.constructor = Channel;

// properties
/**
 * Indicates if the channel is live.
 * @type {boolean}
 */
Channel.prototype.live         = false;
/**
 * The title of the live broadcast
 * @type {string}
 */
Channel.prototype.title        = '';
/**
 * The number of viewers of the live broadcast, -1 if unknown.
 * @type {number}
 */
Channel.prototype.viewers      = -1;
/**
 * Thumbnail of the live broadcast. Typically displayed at a width of 320px.
 * @type {string}
 */
Channel.prototype.thumbnail    = '';
/**
 * An array of URLs that will contain a player of the stream. The first one is
 * treated as the main channel page and opened when the user clicks on the
 * stream.
 * @type {Array.<string>}
 */
Channel.prototype.url          = [];
/**
 * A URL pointing to a page listing past broadcasts. Opened when clicked on the
 * channel while offline.
 * @type {string}
 */
Channel.prototype.archiveUrl   = '';
/**
 * A URL to a page containing only the chat for a broadcast.
 * @type {string}
 */
Channel.prototype.chatUrl      = '';
/**
 * A UNIX timestamp, automatically set by the ChannelList.
 * @type {number}
 * @readonly
 */
Channel.prototype.lastModified = 0;
/**
 * The category of the live broadcast if known.
 * @type {string}
 */
Channel.prototype.category     = '';
/**
 * An Android Intent URI to watch the broadcast.
 * @type {string}
 */
Channel.prototype.intent       = '';

// methods

/**
 * Check if the URL could contain a player for the channel's stream or be
 * associated with the channel in another way (archive page).
 * @argument {string} aUrl - The URL to check
 * @return {boolean} Indicates, if it is a URL associated with the Channel or not.
 */
Channel.prototype.compareUrl = function(aUrl) {
    if(!aUrl || aUrl.match(/^about\:/)) return false;

    var urlA = new URL(aUrl);
    if(urlA.scheme.match(/^http[s]?/)) {
        return this.url.some(function(vUrl) {
            if(urlA.host) {
                var inc = "includes" in String.prototype ? "includes":"contains";
                var urlB = new URL(vUrl),
                    matches = [urlB.host.match(/[a-z0-9\-]+\.[a-z0-9]+$/gi), urlA.host.match(/[a-z0-9\-]+\.[a-z0-9]+$/gi)];
                return matches[0] && matches[1] && matches[0][0] == matches[1][0] && urlA.path[inc](urlB.path);
            }
            return false;
        });
    }
    return false;
};

exports.Channel = Channel;

