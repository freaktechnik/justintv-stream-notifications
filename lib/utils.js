/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

"use strict";

var { Cc } = require("chrome");
var { mix } = require('sdk/core/heritage');

// searches in an array for a value
exports.exactArraySearch = function(array, string, rich) {
    var name;
    for(var item of array) {
        name = (rich?item.login:item);
        if(string==name)
            return true;
    }
    return false;
};


// loads the file from url and returns its contents
exports.getFileContents = function(url) {
    var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
    req.open('GET',url,false);
    req.send();
    return req.responseText;
};

// returns a random number between 100 and 115
exports.randomDelayNumber = function() {
    return 100+Math.floor(Math.random() * 16);
};

/*
    RequestQueue Object
*/

const timers = require("sdk/timers");
var { Request } = require("sdk/request");

RequestQueue.prototype.queue = [];
RequestQueue.prototype._intervalID = null;
RequestQueue.prototype.lastID = 0;
function RequestQueue() {
    this.queue = new Array();
}

RequestQueue.prototype.addRequest = function(requestOptions) {
    this.queue.push(mix(requestOptions,{'id':++this.lastID}));
    return thsi.lastID;
};
RequestQueue.prototype.getRequest = function(index) {
    Request(this.queue[i]).get();
    this.queue.splice(index,1);
};
RequestQueue.prototype.getRequestBatch = function(batchSize) {
    batchSize = batchSize || this.queue.length;
    if(batchSize>this.queue.length) batchSize = this.queue.length;
    
    for(var i = 0;i < batchSize; i++) {
        this.getRequest(0);
    }
};
RequestQueue.prototype.autoFetch = function(interval,amount,maxSize) {
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
    else if(query instanceof Request) {
        for(var r in this.queue) {
            if(identical(Request(this.queue[r]),query)) {
                return r;
            }
        }
    }
    else if(query.url) {
        for(var r in this.queue) {
            if(identical(this.queue[r],query)) {
                return r;
            }
        }
    }
    return -1;
};
RequestQueue.prototype.workingOnQueue = function() {
    return this._intervalID !== null;
};
RequestQueue.prototype.changeInterval = function(newInterval,amount,maxSize) {
    if(this.workingOnQueue()) {
        timers.clearInterval(this._intervalID);
    }
    this.autoFetch(newInterval,amount,maxSize);
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


/*
Original script title: "Object.identical.js"; version 1.12
Copyright (c) 2011, Chris O'Brien, prettycode.org
http://github.com/prettycode/Object.identical.js
*/

function sort(object,sortArrays) {
    if (sortArrays === true && Array.isArray(object)) {
        return object.sort();
    }
    else if (typeof object !== "object" || object === null) {
        return object;
    }

    return Object.keys(object).sort().map(function(key) {
        return {
            key: key,
            value: sort(object[key],sortArrays)
        };
    });
}

function identical(a, b, sortArrays) {    
    return JSON.stringify(sort(a,sortArrays)) === JSON.stringify(sort(b,sortArrays));
};

exports.identical = identical;
