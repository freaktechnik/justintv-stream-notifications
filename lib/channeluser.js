/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 *
 *
 * Channel and User Objects
 */
 
var { mix } = require('sdk/core/heritage');
 
/*
    User
*/

// properties
User.prototype.id=0;
User.prototype.name="";
User.prototype.login="";
User.prototype.image={};
User.prototype.type = "";

function User(id, properties) {
    this.image = new Object();
    this.id = id;
    this = mix(this, properties);
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
        if(s > size && s < index) {
            index = s;
        }
    });
    return this.image[index];
};

User.prototype.toString = function() {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
};

exports.User = User;

/*
    Channel Object
    extends User
*/

Channel.prototype = new User();

// properties
Channel.prototype.live=false;
Channel.prototype.mute=false;
Channel.prototype.title='';
Channel.prototype.viewers=0;
Channel.prototype.url=[];
Channel.prototype.status=false;
Channel.prototype.owner=0;

// constructor
function Channel(id, properties) {
    // init all the arrays, so they aren't global for all objects
    this.url = new Array();
    this.id = id;
    this = mix(this, properties);    
    
    this.update();
}

// methods

Channel.prototype.compareUrl = function(aUrl) {
    var url = new URL(aUrl);
    if(url.scheme.match(/http[s]?/)) {
        return this.url.some(function(vUrl) {
            return url.host&&vUrl.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]==url.host.match(/[a-z]*\.?([a-z]+\.[a-z]+)$/gi)[0]&&url.path.contains(vUrl.path);
        });
    }
    return false;
};

exports.Channel = Channel;
