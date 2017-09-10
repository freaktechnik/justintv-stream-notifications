/**
 * Queue infrastructure for updating info
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue
 */
import EventTarget from 'event-target-shim';
import prefs from '../../preferences';

/**
 * @typedef {external:Response} Response
 * @property {Object} parsedJSON - Parsed JSON response.
 */

/**
 * @callback OnComplete
 * @param {module:queue~Response} response
 */
/**
 * @typedef {Object} Request
 * @property {string} url
 * @property {Object} [headers]
 * @property {module:queue~OnComplete} onComplete
 * @property {function} [onError]
 */
/**
 * @typedef {module:queue~Request} RequestInfo
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
     */
    constructor() {
        super();
        /**
         * @type {Array.<module:queue~RequestInfo>}
         * @protected
         */
        this.queue = [];
        /**
         * @type {Array.<function>}
         * @protected
         */
        this.workers = new Set();
    }

    /**
     * @type {Promise.<number>}
     */
    get workerCount() {
        return prefs.get('queue_concurrentRequests');
    }
    /**
     * Add a request to the queue.
     *
     * @param {module:queue~Request} requestOptions - Options for
     *                                                              the request.
     * @returns {number} ID of the added request.
     */
    addRequest(requestOptions) {
        this.queue.push(Object.assign({ id: ++this.lastID }, requestOptions));
        this.startWorker();
        return this.lastID;
    }

    /**
     * Gets the next request to fetch and removes it from the queue.
     *
     * @returns {module:queue~RequestInfo} Request to fetch.
     */
    getNextRequest() {
        return this.queue.shift();
    }

    /**
     * Loads the next request. Calls the handlers on the request info.
     *
     * @returns {undefined}
     */
    async getRequest() {
        const request = this.getNextRequest();
        try {
            const response = await fetch(request.url, {
                headers: request.headers,
                redirect: "follow"
            });
            // Can't do mime type detection here because some APIs don't feel the need to declare that.
            try {
                const jsonClone = response.clone(),
                    json = await jsonClone.json();
                response.parsedJSON = json;
            }
            catch(e) {
                // response isn't json.
            }
            request.onComplete(response);
        }
        catch(e) {
            if("onError" in request) {
                request.onError(e);
            }
            else {
                console.warn(e);
            }
        }
    }

    /**
     * Remove reference to a stoped worker.
     *
     * @param {Function} worker - Worker to forget.
     * @returns {undefined}
     */
    stopWorker(worker) {
        this.workers.delete(worker);
    }

    /**
     * Returns the worker implmentation.
     *
     * @returns {Function} Worker that works on the queue until it is drained,
     *          then it removes itself.
     */
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

    /**
     * Starts a worker, if there is space in the pool.
     *
     * @returns {undefined}
     */
    async startWorker() {
        if((await this.workerCount) > this.workers.size) {
            const worker = this.getWorker();
            this.workers.add(worker);
            worker();
        }
    }

    /**
     * Starts as many worker as needed, but a maximum of the given pool size.
     *
     * @returns {undefined}
     */
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
