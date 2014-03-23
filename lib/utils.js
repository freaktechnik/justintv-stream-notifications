/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

"use strict";

var { mix } = require('sdk/core/heritage');
var { XMLHttpRequest } = require('sdk/net/xhr');

// searches in an array for a value
exports.exactArraySearch = function(array, string, rich) {
    if(!array) {
        return false;
    }
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};


// loads the file from url and returns its contents

exports.getFileContents = function(url,callback) {
    if(!url.match(/chrome:\/\/|data:\/\/|resource:\/\/|file:\/\//)) {
        throw new Error('Only loading of local files is allowed');
    }
    var req = new XMLHttpRequest();
    function requestLoaded() {
        if(this.readyState==4)
            callback(this.responseText);
    };
    
    req.open('get',url,!!callback);
    if(callback)
        req.onreadystatechange = requestLoaded;
    req.send();
    console.log("sending request for "+url+" with current status "+req.readyState);
    if(!callback)
        return req.responseText;
};

// returns a random number between 100 and 115
exports.randomDelayNumber = function() {
    return 101+Math.floor(Math.random() * 14);
};

/*
    RequestQueue Object
*/

const timers = require("sdk/timers");
var { Request } = require("sdk/request");
var { EventTarget } = require("sdk/event/target");

RequestQueue.prototype = Object.create(EventTarget.prototype);
RequestQueue.prototype.queue = [];
RequestQueue.prototype._intervalID = null;
RequestQueue.prototype.lastID = 0;
RequestQueue.prototype.interval = 0;
function RequestQueue(options) {
    this.initialize(options);
    this.queue = new Array();
}

RequestQueue.prototype.addRequest = function(requestOptions) {
    this.queue.push(mix(requestOptions,{'id':++this.lastID}));
    return this.lastID;
};
RequestQueue.prototype.getRequest = function(index) {
    Request(this.queue[index]).get();
    this.queue.splice(index,1);
};
RequestQueue.prototype.getRequestById = function(query) {
    this.getRequest(this.getRequestIndex(query));
};

RequestQueue.prototype.getRequestBatch = function(batchSize) {
    batchSize = batchSize || this.queue.length;
    if(batchSize>this.queue.length) batchSize = this.queue.length;
    
    for(var i = 0;i < batchSize; i++) {
        this.getRequest(0);
    }
};
RequestQueue.prototype.autoFetch = function(interval,amount,maxSize) {
    this.interval = interval;
    if(interval>0) {
        this._intervalID = timers.setInterval(function(that,amount,maxSize) {
            var size = that.queue.length*amount;
            if(size>maxSize) size = maxSize;
            else if(size<1) size = 1;
            
            that.getRequestBatch(size);
        },interval,this,amount,maxSize);
    }
};
RequestQueue.prototype.clear = function() {
    if(this.workingOnQueue()) {
        timers.clearInterval(this._intervalID);
        this._intervalID = null;
    }
    if(this.queue.length>0) {
        this.queue = new Array();
    }
};
RequestQueue.prototype.requestQueued = function(query) {
    return this.getRequestIndex(query)>-1;
};
RequestQueue.prototype.getRequestIndex = function(query) {
    if(typeof query === 'string') {
        for(var r in this.queue) {
            if(this.queue[r].url === query) { // doesn't need to be unique tought
                return r;
            }
        }
    }
    else if(typeof query === 'number') {
        for(var r in this.queue) {
            if(this.queue[r].id==query) {
                return r;
            }
        }
    }
    return -1;
};
RequestQueue.prototype.workingOnQueue = function() {
    return !!this._intervalID;
};
RequestQueue.prototype.changeInterval = function(newInterval,amount,maxSize) {
    if(this.workingOnQueue()) {
        timers.clearInterval(this._intervalID);
        this._intervalID = null;
    }
    this.autoFetch(newInterval,amount,maxSize);
    this.interval = newInterval;
};

RequestQueue.prototype.removeRequest = function(query) {
    if(this.requestQueued(query)) {
        console.log("removing request");
        this.queue.splice(this.getRequestIndex(query),1);
        return true;
    }
    return false;
};

exports.RequestQueue = RequestQueue;
