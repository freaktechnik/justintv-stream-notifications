/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channel and User Objects
 */

"use strict"; 

var { mix } = require('sdk/core/heritage');
 
/*
    User
*/

// properties
//User.prototype.id        = 0;
User.prototype.uname     = "";
User.prototype.login     = "";
User.prototype.image     = {};
User.prototype.type      = "";
User.prototype.favorites = [];

function User(id) {
    this.image = new Object();
    this.favorites = new Array();
    if(id)
        this.id = id;
}

// methods

User.prototype.getBestImageForSize = function(size) {
    // shortcut if there's an image with the size demanded
    if(this.image.hasOwnProperty(size.toString())) {
        return this.image[size];
    }
    
    // search next biggest image
    var index = Number.MAX_VALUE;
    Object.keys(this.image).forEach(function(s) {
        s = parseInt(s, 10);
        if(s > size && s < index) {
            index = s;
        }
    });
    return this.image[index];
};

User.prototype.toString = function() {
    return this.uname.charAt(0).toUpperCase() + this.uname.slice(1);
};

exports.User = User;

/*
    Channel Object
    extends User
*/

// constructor
function Channel(id) {
    User.call(this, id);
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();  
}

Channel.prototype = Object.create(User);
Channel.prototype.constructor = Channel;

// properties
Channel.prototype.live       = false;
Channel.prototype.title      = '';
Channel.prototype.viewers    = 0;
Channel.prototype.thumbnail  = '';
Channel.prototype.url        = [];
Channel.prototype.archiveUrl = '';

// methods

Channel.prototype.compareUrl = function(aUrl) {
    var urlO = new URL(aUrl);
    if(urlO.scheme.match(/http[s]?/)) {
        return this.url.some(function(vUrl) {
            if(urlO.host) {
                var matches = [vUrl.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi), urlO.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)];
                return matches[0] && matches[1] && matches[0][0] == matches[1][0] && urlO.path.contains(vUrl.path);
            }
            return false;
        });
    }
    return false;
};

exports.Channel = Channel;

