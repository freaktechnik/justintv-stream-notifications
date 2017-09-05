/**
 * Queue infrastructure for updating info
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue
 */
import EventTarget from 'event-target-shim';
import prefs from '../../preferences';

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
     * Last ID assigned to a request.
     *
     * @type {number}
     * @default -1
     * @protected
     */
    lastID = -1;
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
        this.workers = new Set();
    }

    get workerCount() {
        return prefs.get('queue_concurrentRequests');
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
        this.startWorker();
        return this.lastID;
    }

    getNextRequest() {
        return this.queue.shift();
    }

    async getRequest() {
        const request = this.getNextRequest();
        try {
            const response = await fetch(request.url, {
                headers: request.headers,
                redirect: "follow"
            });
            const jsonClone = response.clone();
            const json = await jsonClone.json();
            response.parsedJSON = json;
            request.onComplete(response);
        }
        catch(e) {
            if("onError" in request) {
                request.onError(e);
            }
        }
    }

    stopWorker(worker) {
        this.workers.delete(worker);
    }

    getWorker() {
        const worker = () => {
            if(this.queue.length) {
                return this.getRequest().then(worker);
            }
            else {
                this.stopWorker(worker);
            }
        };
        return worker;
    }

    async startWorker() {
        if(this.workers.size < await this.workerCount) {
            const worker = this.getWorker();
            this.workers.add(worker);
            worker();
        }
    }

    async startAllWorkers() {
        const count = Math.min((await this.workerCount), this.queue.length);
        for(let i = 0; i < count; ++i) {
            this.startWorker();
        }
    }
    /**
     * Remove all requests and ongoing intervals.
     *
     * @returns {undefined}
     */
    clear() {
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
     * @type {boolean}
     */
    get workingOnQueue() {
        return this.workers.size > 0;
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
