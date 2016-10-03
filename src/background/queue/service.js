/**
 * Queue service for providers. Provides a separated management for requests by
 * provider, all in the same {@link module:queue/update.UpdateQueue}.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/service
 * @requires module:queue/update
 */

//TODO pre-calculate Response.json()?
import UpdateQueue from "./update";
import prefs from "../preferences";

const queue = new UpdateQueue(),
    services = {},
    defaultRequeue = (response) => !response.ok,
    completeCallback = (requeue, callback, url, data) => {
        if(!requeue(data)) {
            callback(data, url);
        }
    };


/**
 * @callback updateRequestCallback
 * @param {external:sdk/request~Response} data
 * @param {string} url
 */

/**
 * A service providing methods for a provider to place one-time and reocurring
 * requests.
 *
 * @class
 */
class QueueService {
    static HIGH_PRIORITY = "high";
    static LOW_PRIORITY = "low";
    /**
     * @private
     * @type {Array}
     */
    highPriorityRequestIds = [];
    /**
     * @private
     * @type {Array}
     */
    lowPriorityRequestIds = [];
    HIGH_PRIORITY = QueueService.HIGH_PRIORITY;
    LOW_PRIORITY = QueueService.LOW_PRIORITY;
    constructor() {
        this.highPriorityRequestIds = [];
        this.lowPriorityRequestIds = [];
    }

    /**
     * Returns the request ID array for the specified priority.
     *
     * @private
     * @param {module:queue-service~QueuePriority} priority - Priority to get
     *                                                        the array for.
     * @returns {Array} Array of request IDs.
     */
    getRequestProperty(priority) {
        return this[priority + "PriorityRequestIds"];
    }

    /**
     * Determines if the request has to be requeued due to errors.
     *
     * @callback requeue
     * @param {external:sdk/request~Response} data - Response that was returned.
     * @returns {boolean} When true, the request will be queued again.
     */
    /**
     * Immediately run a request to the given URL.
     *
     * @param {string} url - The URL to request.
     * @param {Object.<string, string>} [headers={}] - An object with the headers
     *                                                 to send.
     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
     *                             - Determines if the request should be re-run.
     * @param {number} [attempt=0] - Counter to avoid requeuing infinitely.
     * @returns {Promise} A promise resolving with the Add-on SDK Request response.
     */
    queueRequest(url, headers = {}, requeue = defaultRequeue, attempt = 0) {
        console.log("Queueing " + url);
        return new Promise((resolve, reject) => {
            const id = queue.addRequest({
                url,
                headers: new Headers(headers),
                onComplete: (data) => {
                    if(requeue(data)) {
                        prefs.get("queueservice_maxRetries").then((maxRetries) => {
                            if(attempt < maxRetries) {
                                resolve(this.queueRequest(url, headers, requeue, ++attempt));
                            }
                            else {
                                reject("Too many attempts");
                            }
                        });
                    }
                    else {
                        console.log("passing on to the provider");
                        resolve(data);
                    }
                },
                onError: reject
            }, false, true);

            if(attempt === 0 && navigator.onLine) {
                queue.getRequestById(id);
            }
        });
    }

    /**
     * Unqueues an all update requests of the given priority. If none is given,
     * all update requests are unqueued.
     *
     * @param {module:queue/service~QueuePriority?} priority - Priority of
     *                                                      reuqests to unqueue.
     */
    unqueueUpdateRequest(priority) {
        if(!priority) {
            this.unqueueUpdateRequest(QueueService.HIGH_PRIORITY);
            this.unqueueUpdateRequest(QueueService.LOW_PRIORITY);
        }
        else {
            if(this.getRequestProperty(priority).length > 0) {
                this.getRequestProperty(priority).forEach((reqId) => {
                    queue.removeRequest(reqId);
                });
                this.getRequestProperty(priority).length = 0;
            }
        }
    }
    /**
     * Queue a new reocurring update request of the given priority. Removes all
     * existing update requests of this priority.
     *
     * @param {Array.<string>} urls - An array of URLs to call.
     * @param {module:queue/service~QueuePriority} priority - Priority to queue
     *                                                        the request as.
     * @param {module:queue/service~updateRequestCallback} callback - Called
     *                                           whenever a request is done (for
     *                                           each provided URL).
     * @param {Object.<string,string>} [headers={}] - An object with header-value
     *                                                pairs to send with the
     *                                                request.
     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
     *                             - Determinines if a request should be re-run.
     */
    queueUpdateRequest(urls, priority, callback, rawHeaders = {}, requeue = defaultRequeue) {
        console.log("Requeueing " + priority + " priority update request");
        this.unqueueUpdateRequest(priority);
        const requests = this.getRequestProperty(priority),
            skips = priority == QueueService.LOW_PRIORITY ? 4 : 0,
            headers = new Headers(rawHeaders);

        requests.push(...urls.map((url) => queue.addRequest(
            {
                url,
                headers,
                onComplete: completeCallback.bind(null, requeue, callback, url)
            },
            true,
            false,
            skips
        )));
    }
}

/**
 * Get a QueueService for the usage in a provider.
 *
 * @param {string} providerName - The type of the provider.
 * @returns {module:queue/service~QueueService} QueueService for the provider.
 */
export const getServiceForProvider = (providerName) => {
    if(!services.hasOwnProperty(providerName)) {
        services[providerName] = new QueueService();
    }
    return services[providerName];
};

/**
 * Set the internal queue refresh properties.
 *
 * @param {module:queue/pauseable~QueueOptions} options - Queue options.
 */
export const setOptions = (options) => {
    console.log("[QS]> setting queue options:" + options.toSource());
    queue.autoFetch(options.interval,
                    options.amount,
                    options.maxSize);
};

/**
 * Change the interval of the internal queue.
 *
 * @param {number} interval - Refresh interval in milliseconds.
 */
export const updateOptions = (interval) => {
    console.log("[QS]> setting interval to " + interval);
    queue.autoFetch(interval);
};

/**
 * Pause the internal queue.
 */
export const pause = () => {
    queue.pause();
};

/**
 * Resume the internal queue.
 */
export const resume = () => {
    queue.resume();
};

/**
 * @typedef {Object} QueueServiceListener
 * @property {function} containsPriorized - Callback for the
 * {@link module:queue/update.UpdateQueue#event:queuepriorized} event of the
 * internal queue.
 * @property {function} priorizedLoaded - Callback for the
 * {@link module:queue/update.UpdateQueue#event:allpriorizedloaded} event of the
 * internal queue.
 * @property {function} paused
 * @property {function} resumed
 */

/**
 * Add event listeners to the internal queue.
 *
 * @param {module:queue/service~QueueServiceListener} <ObjectPattern> - Listeners to add.
 */
export const addListeners = ({ containsPriorized, priorizedLoaded, paused, resumed }) => {
    if(containsPriorized) {
        queue.addEventListener("queuepriorized", containsPriorized);
    }
    if(priorizedLoaded) {
        queue.addEventListener("allpriorizedloaded", priorizedLoaded);
    }
    if(paused) {
        queue.addEventListener("pause", paused);
    }
    if(resumed) {
        queue.addEventListener("resume", resumed);
    }
};

/**
 * Remove event listeners from the internal queue.
 *
 * @param {module:queue/service~QueueServiceListener} <ObjectPattern> - Listeners to remove.
 */
export const removeListeners = ({ containsPriorized, priorizedLoaded, paused, resumed }) => {
    if(containsPriorized) {
        queue.removeEventListener("queuepriorized", containsPriorized);
    }
    if(priorizedLoaded) {
        queue.removeEventListener("allpriorizedloaded", priorizedLoaded);
    }
    if(paused) {
        queue.removeEventListener("pause", paused);
    }
    if(resumed) {
        queue.removeEventListener("resume", resumed);
    }
};
