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
    if(this.image.hasOwnProperty(size)) {
        return this.image[size];
    }
    
    // search next biggest image
    var index = 0;
    Object.keys(this.image).forEach(function(s) {
        s = Number.parseInt(s, 10);
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
//Channel.prototype.status=false;

// methods

Channel.prototype.compareUrl = function(aUrl) {
    var url = new URL(aUrl);
    if(url.scheme.match(/http[s]?/)) {
        return this.url.some(function(vUrl) {
            return url.host &&
                    vUrl.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0] == url.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0] &&
                    url.path.contains(vUrl.path);
        });
    }
    return false;
};

exports.Channel = Channel;
