/**
 * Queue infrastructure for updating info
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue
 */
import timers from "sdk/timers";
import { Request } from "sdk/request";
import EventTarget from "../event-target";

/**
 * @typedef {Object} external:sdk/request.RequestOptions
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Request%28options%29}
 */

/**
 * @typedef {external:sdk/request.RequestOptions} RequestInfo
 * @property {number} id
 */
/**
 * @class module:queue.RequestQueue
 * @extends external:sdk/event/target.EventTarget
 */
export default class RequestQueue extends EventTarget {
    /**
     * ID of the queue interval.
     *
     * @type {number?}
     * @private
     */
    _intervalID = null;
    /**
     * Last ID assigned to a request.
     *
     * @type {number}
     * @default -1
     * @protected
     */
    lastID = -1;
    /**
     * Time interval between fetched requests.
     *
     * @type {number}
     * @default 0
     * @readonly
     */
    interval = 0;
    /**
     * RequestQueue Object.
     *
     * @constructs
     * @param {Object} options - Event listeners to attach.
     */
    constructor(options) {
        super(options);
        /**
         * @type {array.<module:queue~RequestInfo>}
         * @protected
         */
        this.queue = [];
    }
    /**
     * Add a request to the queue.
     *
     * @param {external:sdk/request.RequestOptions} requestOptions - Options for
     *                                                              the request.
     * @returns {number} ID of the added request.
     */
    addRequest(requestOptions) {
        this.queue.push(Object.assign({ id: ++this.lastID }, requestOptions));
        return this.lastID;
    }
    /**
     * Fetch the request with the given index in the queue.
     *
     * @param {number} index - Index of the request to fetch.
     * @returns {module:queue~RequestInfo} The request info for that request.
     */
    getRequest(index) {
        new Request(this.queue[index]).get();
        return this.queue.splice(index, 1)[0];
    }
    /**
     * Fetch the request with the given ID.
     *
     * @param {number|string} query - ID or URL of the request to fetch.
     */
    getRequestById(query) {
        this.getRequest(this.getRequestIndex(query));
    }
    /**
     * Fetch multiple requests from the top of the queue.
     *
     * @param {number} [batchSize=this.queue.length] - Number of requests to get.
     */
    getRequestBatch(batchSize = this.queue.length) {
        if(batchSize > this.queue.length) {
            batchSize = this.queue.length;
        }

        for(let i = 0; i < batchSize; i++) {
            this.getRequest(0);
        }
    }
    /**
     * Set up an interval to fetch a certain amount of requests periodically.
     * Can also be used to change the interval.
     *
     * @param {number} interval - Interval in milliseconds.
     * @param {number} amount - A percentage of requests to get per batch.
     * @param {number} maxSize - The max number of requests to get per batch.
     */
    autoFetch(interval, amount, maxSize) {
        this.interval = interval;
        if(this.workingOnQueue()) {
            timers.clearInterval(this._intervalID);
            this._intervalID = null;
        }
        if(interval > 0) {
            this._intervalID = timers.setInterval(
                () => {
                    const size = Math.max(
                      1,
                      Math.min(this.queue.length * amount, maxSize)
                    );
                    this.getRequestBatch(size);
                },
                interval
            );
        }
    }
    /**
     * Remove all requests and ongoing intervals.
     */
    clear() {
        if(this.workingOnQueue()) {
            timers.clearInterval(this._intervalID);
            this._intervalID = null;
        }
        this.interval = 0;
        if(this.queue.length > 0) {
            this.queue.length = 0;
        }
    }
    /**
     * Check if a request is still in the queue.
     *
     * @param {number|string} query - ID or URL of the request.
     * @returns {boolean} Wether the request is still queued.
     */
    requestQueued(query) {
        return this.getRequestIndex(query) > -1;
    }
    /**
     * Get the index of a request.
     *
     * @param {number|string} query - ID or URL of the request.
     * @returns {number} Index of the request. -1 if the request couldn't be
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
    }
    /**
     * Check if the queue is currently peridoically fetching requests.
     *
     * @returns {boolean} Whether there is an interval set up.
     */
    workingOnQueue() {
        return this._intervalID !== null || this.interval !== 0;
    }
    /**
     * Remove a request from the queue.
     *
     * @param {number|string} query - ID or URL of the request.
     * @returns {boolean} Whether or not the request has been removed.
     */
    removeRequest(query) {
        if(this.requestQueued(query)) {
            console.log("[Queue]> removing request");
            this.queue.splice(this.getRequestIndex(query), 1);
            return true;
        }
        return false;
    }
}
