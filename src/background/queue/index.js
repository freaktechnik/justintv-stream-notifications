/**
 * Queue infrastructure for updating info
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue
 */
import EventTarget from 'event-target-shim';

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
 * @extends external:EventTarget
 */
export default class RequestQueue extends EventTarget {
    /**
     * ID of the queue interval.
     *
     * @type {number?}
     * @private
     */
    _alarmName = "main-queue";
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
    amount = 0.5;
    maxSize = 10;
    /**
     * RequestQueue Object.
     *
     * @constructs
     */
    constructor() {
        super();
        /**
         * @type {array.<module:queue~RequestInfo>}
         * @protected
         */
        this.queue = [];

        browser.alarms.onAlarm.addListener((alarm) => {
            if(alarm.name == this._alarmName) {
                const size = Math.max(1, Math.min(this.queue.length * this.amount, this.maxSize));
                this.getRequestBatch(size);
            }
        });
    }
    /**
     * Add a request to the queue.
     *
     * @param {external:sdk/request.RequestOptions} requestOptions - Options for
     *                                                              the request.
     * @returns {number} ID of the added request.
     */
    addRequest(requestOptions) {
        this.queue.push(Object.assign({ id: ++this.lastID, method: "GET" }, requestOptions));
        return this.lastID;
    }
    /**
     * Fetch the request with the given index in the queue.
     *
     * @param {number} index - Index of the request to fetch.
     * @returns {undefined}
     */
    getRequest(index) {
        const spec = this.queue.splice(index, 1)[0];
        fetch(spec.url, {
            headers: spec.headers,
            redirect: "follow"
        }).then((response) => {
            const jsonClone = response.clone();
            return jsonClone.json().then((json) => {
                response.parsedJSON = json;
                spec.onComplete(response);
            }, () => {
                spec.onComplete(response);
            });
        }, (error) => {
            console.error(error);
            if(spec.onError) {
                spec.onError(error);
            }
            else {
                throw error;
            }
        });
        return spec;
    }
    /**
     * Fetch the request with the given ID.
     *
     * @param {number|string} query - ID or URL of the request to fetch.
     * @returns {undefined}
     */
    getRequestById(query) {
        return this.getRequest(this.getRequestIndex(query));
    }
    /**
     * Fetch multiple requests from the top of the queue.
     *
     * @param {number} [batchSize=this.queue.length] - Number of requests to get.
     * @returns {undefined}
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
     * @returns {undefined}
     */
    async autoFetch(interval, amount, maxSize) {
        this.interval = interval;
        this.amount = amount;
        this.maxSize = maxSize;
        if(this.workingOnQueue()) {
            await browser.alarms.clear(this._alarmName);
        }
        if(interval > 0) {
            browser.alarms.create(this._alarmName, {
                periodInMinutes: interval / 60000
            });
        }
    }
    /**
     * Remove all requests and ongoing intervals.
     *
     * @returns {undefined}
     */
    clear() {
        if(this.workingOnQueue()) {
            browser.alarms.clear(this._alarmName);
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
        return this.interval !== 0;
    }
    /**
     * Remove a request from the queue.
     *
     * @param {number|string} query - ID or URL of the request.
     * @returns {boolean} Whether or not the request has been removed.
     */
    removeRequest(query) {
        if(this.requestQueued(query)) {
            this.queue.splice(this.getRequestIndex(query), 1);
            return true;
        }
        return false;
    }
}
