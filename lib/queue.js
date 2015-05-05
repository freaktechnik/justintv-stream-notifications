/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Queue infrastructure for updating info
 */

"use strict";


const timers = require("sdk/timers");
var { Request }     = require("sdk/request"),
    { EventTarget } = require("sdk/event/target"),
    { emit }        = require("sdk/event/core"),
    { mix }         = require("sdk/core/heritage");

/*
    RequestQueue Object
*/

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
RequestQueue.prototype.autoFetch = function(interval, amount, maxSize) {
    this.interval = interval;
    if(interval>0) {
        this._intervalID = timers.setInterval((function(amount, maxSize) {
            var size = this.queue.length*amount;
            if(size>maxSize) size = maxSize;
            else if(size<1) size = 1;

            this.getRequestBatch(size);
        }).bind(this), interval, amount, maxSize);
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
        return this.queue.findIndex(function(req) {
            return req.id==query;
        });
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
    UpdateQueue Object
    This is an expansion of the RequestQueue Object.
*/

function UpdateQueue() {
    RequestQueue.call(this);
}
UpdateQueue.prototype = Object.create(RequestQueue.prototype);
UpdateQueue.prototype.constructor = UpdateQueue;

// @override
UpdateQueue.prototype.addRequest = function(requestArgs,persistent,priorized,skip) {
    persistent = persistent || false;
    skip = skip || 0;
    // only allow priorized if its either not a persistent request or it skips
    // skipping requests are only priorized for the first time the are actually sent
    // however they will the first time not skip.
    priorized = (priorized&&(!persistent||skip>0)) || false;

    if(!this.containsPriorized()&&priorized) {
        emit(this, "queuepriorized");
    }
    this.queue.push(mix(requestArgs,{'persist':persistent,'priorize':priorized,'id':++this.lastID,'skip':skip,'skipped':0}));

    /*if(priorized && this.interval == 0) {
        this.getRequest(this.lastID);
    }*/

    return this.lastID;
};
// @override
UpdateQueue.prototype.getRequest = function(index) {
    if(this.containsPriorized()) {
        this.getFirstPriorized();
        if(!this.containsPriorized()) {
            emit(this, "allpriorizedloaded");
        }
    }
    else {
        this.getRequestByIndex(index);
    }
};

UpdateQueue.prototype.getFirstPriorized = function() {
    for(var i in this.queue) {
        if(this.queue[i].priorize) {
            this.getRequestByIndex(i);
            break;
        }
    }
};

UpdateQueue.prototype.getRequestByIndex = function(index) {
    console.info(this.queue.length+" jobs left in the queue.");
    if(this.queue[index].skip>this.queue[index].skipped&&!this.queue[index].priorize) {
        console.log("[Queue]> Skipping "+this.queue[index].url);
        this.queue[index].skipped++;

        this.queue.push(this.queue.splice(index,1)[0]);
    }
    else {
        console.log("[Queue]> Getting "+this.queue[index].url);

        Request(this.queue[index]).get();
        if(this.queue[index].persist) {

            // explication of the skipping logic in the addRequest method
            if(this.queue[index].skip>0) {
                this.queue[index].skipped = 0;
                if(this.queue[index].priorize) {
                    this.queue[index].priorize = false;
                }
            }

            this.queue.push(this.queue.splice(index,1)[0]);
        }
        else {
            this.queue.splice(index,1);
        }
    }
};

UpdateQueue.prototype.containsPriorized = function() {
    return this.queue.some(function(item) {
        return item.priorize;
    });
};

exports.UpdateQueue = UpdateQueue;

