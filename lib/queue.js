/**
 * Queue infrastructure for updating info
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue
 */

"use strict";

const timers = require("sdk/timers");
var { Request }     = require("sdk/request"),
    { EventTarget } = require("sdk/event/target"),
    { emit, setListeners }        = require("sdk/event/core"),
    { Class: newClass } = require("sdk/core/heritage");

/**
 * @typedef {Object} external:sdk/request.RequestOptions
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Request%28options%29}
 */

const queueListener = (amount, maxSize, q) => {
    let size = Math.max(
        1,
        Math.min(q.queue.length * amount, maxSize)
    );
    q.getRequestBatch(size);
};

/**
 * @typedef {external:sdk/request.RequestOptions} RequestInfo
 * @property {number} id
 */
const RequestQueue = newClass(
/** @lends module:queue.RequestQueue.prototype */
{
    extends: EventTarget,
    /**
     * RequestQueue Object
     * @constructs
     * @argument {Object.<string,function>} options - Event listener options object
     * @extends external:sdk/event/target.EventTarget
     */
    initialize(options) {
        setListeners(this, options);
        this.queue = [];
    },
    /**
     * @type {array.<module:queue~RequestInfo>}
     * @protected
     */
    queue: [],
    /**
     * ID of the queue interval.
     * @type {number?}
     * @private
     */
    _intervalID: null,
    /**
     * Last ID assigned to a request.
     * @type {number}
     * @default -1
     * @protected
     */
    lastID: -1,
    /**
     * Time interval between fetched requests.
     * @type {number}
     * @default 0
     * @readonly
     */
    interval: 0,
    /**
     * Add a request to the queue
     * @argument {external:sdk/request.RequestOptions} requestOptions
     * @return {number} ID of the added request.
     */
    addRequest(requestOptions) {
        this.queue.push(Object.assign({ id: ++this.lastID }, requestOptions));
        return this.lastID;
    },
    /**
     * Fetch the request with the given index in the queue.
     * @argument {number} index - Index of the request to fetch
     */
    getRequest(index) {
        new Request(this.queue[index]).get();
        this.queue.splice(index,1);
    },
    /**
     * Fetch the request with the given ID
     * @argument {number|string} query - ID or URL of the request to fetch
     */
    getRequestById(query) {
        this.getRequest(this.getRequestIndex(query));
    },
    /**
     * Fetch multiple requests from the top of the queue.
     * @argument {number} [batchSize = this.queue.length] - Number of requests to get
     */
    getRequestBatch(batchSize = this.queue.length) {
        if(batchSize > this.queue.length) batchSize = this.queue.length;

        for(var i = 0;i < batchSize; i++) {
            this.getRequest(0);
        }
    },
    /**
     * Set up an interval to fetch a certain amount of requests periodically.
     * @argument {number} interval - Interval in milliseconds.
     * @argument {number} amount - A percentage of requests to get per batch.
     * @argument {number} maxSize - The max number of requests to get per batch.
     */
    autoFetch(interval, amount, maxSize) {
        this.interval = interval;
        if(interval > 0) {
            this._intervalID = timers.setInterval(
                queueListener,
                interval,
                amount,
                maxSize,
                this
            );
        }
    },
    /**
     * Remove all requests and ongoing intervals.
     */
    clear() {
        if(this.workingOnQueue()) {
            timers.clearInterval(this._intervalID);
            this._intervalID = null;
        }
        if(this.queue.length > 0) {
            this.queue.length = 0;
        }
    },
    /**
     * Check if a request is still in the queue.
     * @artumgent {number|string} query - ID or URL of the request
     * @return {boolean} Wether the request is still queued
     */
    requestQueued(query) {
        return this.getRequestIndex(query)>-1;
    },
    /**
     * Get the index of a request.
     * @argument {number|string} query - ID or URL of the request
     * @return {number} Index of the request. -1 if the request couldn't be
     * found.
     */
    getRequestIndex(query) {
        if(typeof query === 'string') {
            return this.queue.findIndex((req) => req.url === query);
        }
        else if(typeof query === 'number') {
            return this.queue.findIndex((req) => req.id === query);
        }
        return -1;
    },
    /**
     * Check if the queue is currently peridoically fetching requests.
     * @return {boolean} Whether there is an interval set up.
     */
    workingOnQueue() {
        return !!this._intervalID;
    },
    /**
     * Change the interval between automatically fetching requests.
     * @argument {number} newInterval - The new interval for the queue.
     * @argument {number} amount - Precentage of requests to fetch per batch.
     * @argument {number} maxSize - Maximum number of requests to fetch per
     *                              batch.
     */
    changeInterval(newInterval,amount,maxSize) {
        if(this.workingOnQueue()) {
            timers.clearInterval(this._intervalID);
            this._intervalID = null;
        }
        this.autoFetch(newInterval,amount,maxSize);
    },
    /**
     * Remove a request from the queue.
     * @argument {number|string} query - ID or URL of the request.
     * @return {boolean} Whether or not the request has been removed.
     */
    removeRequest(query) {
        if(this.requestQueued(query)) {
            console.log("[Queue]> removing request");
            this.queue.splice(this.getRequestIndex(query),1);
            return true;
        }
        return false;
    }
});

exports.RequestQueue = RequestQueue;

/**
 * Fired when there is a new priorized item added to the queue.
 * @event module:queue.UpdateQueue#queuepriorized
 */
/**
 * Fired when all priorized items in the queue were fetched.
 * @event module:queue.UpdateQueue#allpriorizedloaded
 */

/**
 * A queue with priorized, persistent and less often fetched requests.
 * @constructs module:queue.UpdateQueue
 * @extends module:queue.RequestQueue
 */
const UpdateQueue = newClass(
/** @lends module:queue.UpdateQueue.prototype */
{
    extends: RequestQueue,
    /**
     * Add a request to the queue
     * @argument {external:sdk/request.RequestOptions} requestOptions
     * @argument {boolean} [persistent = false] - If the request should be
     *                                            readded to the queue whenever
     *                                            it was fetched.
     * @argument {boolean} [priorized = false] - If the request should be
     *                                           priorized over other requests
     *                                           in the queue. Can not be true
     *                                           when the request is persistent
     *                                           or skipping.
     * @argument {number} [skip=0] - Number of times to skip this request before
     *                               fetching it.
     * @return {number} ID of the added request.
     * @fires module:queue.UpdateQueue#queuepriorized
     */
    addRequest(requestArgs, persistent = false, priorized = false, skip = 0) {
        // only allow priorized if its either not a persistent request or it skips
        // skipping requests are only priorized for the first time the are actually sent
        // however they will the first time not skip.
        priorized = priorized && (!persistent || skip > 0);

        if(!this.containsPriorized() && priorized) {
            emit(this, "queuepriorized");
        }
        this.queue.push(Object.assign({
            persist: persistent,
            priorize: priorized,
            id: ++this.lastID,
            skip,
            skipped: 0
        }, requestArgs));

        return this.lastID;
    },
    /**
     * Fetch multiple requests from the top of the queue.
     * @argument {number} batchSize - Number of requests to get
     * @fires module:queue.UpdateQueue#allpriorizedloaded
     */
    getRequest: function(index) {
        if(this.containsPriorized()) {
            this.getFirstPriorized();
            if(!this.containsPriorized()) {
                emit(this, "allpriorizedloaded");
            }
        }
        else {
            this.getRequestByIndex(index);
        }
    },
    /**
     * Fetch the first priorized request in the queue.
     */
    getFirstPriorized() {
        this.queue.some((req, i) => {
            if(req.priorize) {
                this.getRequestByIndex(i);
                return true;
            }
            return false;
        });
    },
    /**
     * Fetch the request at the given index.
     * @argument {number} index - Index in the queue of the request.
     */
    getRequestByIndex(index) {
        console.info(this.queue.length+" jobs left in the queue.");
        if(this.queue[index].skip > this.queue[index].skipped &&
           !this.queue[index].priorize) {
            console.log("[Queue]> Skipping "+this.queue[index].url);
            this.queue[index].skipped++;

            this.queue.push(this.queue.splice(index,1)[0]);
        }
        else {
            console.log("[Queue]> Getting "+this.queue[index].url);

            new Request(this.queue[index]).get();
            if(this.queue[index].persist) {

                // explication of the skipping logic in the addRequest method
                if(this.queue[index].skip > 0) {
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
    },
    /**
     * Check if the queue has a priorized request waiting.
     * @return {boolean} Whether there is a priorized request in the queue.
     */
    containsPriorized() {
        return this.queue.some((item) => item.priorize);
    }
});

exports.UpdateQueue = UpdateQueue;

