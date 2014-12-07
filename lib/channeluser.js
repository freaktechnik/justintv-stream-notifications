/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Channel and User Objects
 */

"use strict"; 

var { URL } = require('sdk/url');
 
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
    size = parseInt(size, 10);
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

Channel.prototype = Object.create(User.prototype);
Channel.prototype.constructor = Channel;

// properties
Channel.prototype.live       = false;
Channel.prototype.title      = '';
Channel.prototype.viewers    = 0;
Channel.prototype.thumbnail  = '';
Channel.prototype.url        = [];
Channel.prototype.archiveUrl = '';
//chat
//lastModified
//category

// methods

Channel.prototype.compareUrl = function(aUrl) {
    var urlA = new URL(aUrl);
    if(urlA.scheme.match(/http[s]?/)) {
        return this.url.some(function(vUrl) {
            if(urlA.host) {
                var urlB = new URL(vUrl),
                    matches = [urlB.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi), urlA.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)];
                return matches[0] && matches[1] && matches[0][0] == matches[1][0] && urlA.path.contains(urlB.path);
            }
            return false;
        });
    }
    return false;
};

exports.Channel = Channel;

