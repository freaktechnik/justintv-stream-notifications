/**
 * Queue service for providers. Provides a separated management for requests by
 * provider, all in the same {@link module:queue/update.UpdateQueue}.
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/service
 * @requires module:queue/update
 */

"use strict";

const { UpdateQueue } = require("./update");

const { NetUtil: { ioService }} = require("resource://gre/modules/NetUtil.jsm");

const { defer } = require("sdk/core/promise");
const { prefs } = require("sdk/simple-prefs");

const queue = new UpdateQueue();
let services = {};
const defaultRequeue = (response) => response.status > 499;

/**
 * Get a QueueService for the usage in a provider
 * @argument {string} providerName - The type of the provider
 * @return {module:queue/service~QueueService}
 */
exports.getServiceForProvider = function(providerName) {
    if(!services.hasOwnProperty(providerName)) {
        services[providerName] = new QueueService();
    }
    return services[providerName];
};

/**
 * Set the internal queue refresh properties.
 * @argument {module:queue/pauseable~QueueOptions} options
 */
exports.setOptions = function(options) {
    console.log("[QS]> setting queue options:"+options.toSource());
    queue.autoFetch(options.interval,
                    options.amount,
                    options.maxSize);
};

/**
 * Change the interval of the internal queue.
 * @argument {number} interval - Refresh interval in milliseconds.
 */
exports.updateOptions = function(interval) {
    console.log("[QS]> setting interval to "+interval);
    queue.autoFetch(interval);
};

/**
 * Pause the internal queue.
 */
exports.pause = function() {
    queue.pause();
};

/**
 * Resume the internal queue.
 */
exports.resume = function() {
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
 * @argument {module:queue/service~QueueServiceListener} listeners
 */
exports.addListeners = function({ containsPriorized, priorizedLoaded, paused, resumed }) {
    if(containsPriorized)
        queue.on("queuepriorized", containsPriorized);
    if(priorizedLoaded)
        queue.on("allpriorizedloaded", priorizedLoaded);
    if(paused)
        queue.on("pause", paused);
    if(resumed)
        queue.on("resume", resumed);
};

/**
 * Remove event listeners from the internal queue.
 * @argument {module:queue/service~QueueServiceListener} listeners
 */
exports.removeListeners = function({ containsPriorized, priorizedLoaded, paused, resumed }) {
    if(containsPriorized)
        queue.off("queuepriorized", containsPriorized);
    if(priorizedLoaded)
        queue.off("allpriorizedloaded", priorizedLoaded);
    if(paused)
        queue.off("pause", paused);
    if(resumed)
        queue.off("resume", resumed);
};

/**
 * @typedef QueuePriority
 * @type {string}
 * @see {@link module:queue/service~QueueService.HIGH_PRIORITY} and {@link module:queue/service~QueueService.LOW_PRIORITY}
 */
/**
 * Constant for high priority reocurring requests, typically the channel live
 * status.
 * @const {module:queue/service~QueuePriority}
 * @default "high"
 * @alias module:queue/service~QueueService.HIGH_PRIORITY
 */
QueueService.prototype.HIGH_PRIORITY = QueueService.HIGH_PRIORITY = "high";
/**
 * Constant for low priority reocurring requests, typically the user favorites.
 * @const {module:queue/service~QueuePriority}
 * @default "low"
 * @alias module:queue/service~QueueService.LOW_PRIORITY
 */
QueueService.prototype.LOW_PRIORITY = QueueService.LOW_PRIORITY  = "low";

/**
 * @private
 * @type {Array}
 */
QueueService.prototype.highPriorityRequestIds = [];
/**
 * @private
 * @type {Array}
 */
QueueService.prototype.lowPriorityRequestIds = [];
/**
 * A service providing methods for a provider to place one-time and reocurring
 * requests.
 * @constructor
 */
function QueueService() {
    this.highPriorityRequestIds = [];
    this.lowPriorityRequestIds = [];
}

/**
 * Returns the request ID array for the specified priority.
 * @private
 */
QueueService.prototype.getRequestProperty = function(priority) {
    return this[priority+"PriorityRequestIds"];
};

/**
 * Determines if the request has to be requeued due to errors.
 * @callback requeue
 * @argument {external:sdk/request~Response} data
 * @return {boolean} When true, the request will be queued again.
 */
/**
 * Immediately run a request to the given URL.
 * @argument {string} url - The URL to request.
 * @argument {Object.<string, string>} [headers={}] - An object with the headers
 *                                                    to send.
 * @argument {module:queue/service~requeue} [requeue=(r) => r.status > 499]
 *                                  Determines if the request should be re-run.
 * @argument {number} [attempt=0] - Counter to avoid requeuing infinitely.
 * @return {Promise} A promise resolving with the Add-on SDK Request response.
 */
QueueService.prototype.queueRequest = function(url, headers = {}, requeue = defaultRequeue, attempt = 0) {
    let { promise, resolve, reject } = defer();

    console.log("Queueing "+url);
    let id = queue.addRequest({
        url: url,
        headers: headers,
        onComplete: (data) => {
            if(requeue(data)) {
                if(attempt < prefs.queueservice_maxRetries)
                    resolve(this.queueRequest(url, headers, requeue, ++attempt));
                else
                    reject("Too many attempts");
            }
            else {
                resolve(data);
            }
        }
    }, false, true);

    if(attempt === 0 && !ioService.offline)
        queue.getRequestById(id);

    return promise;
};

/**
 * Unqueues an all update requests of the given priority. If none is given, all
 * update requests are unqueued.
 * @argument {module:queue/service~QueuePriority?} priority
 */
QueueService.prototype.unqueueUpdateRequest = function(priority) {
    if(!priority) {
        this.unqueueUpdateRequest(QueueService.HIGH_PRIORITY);
        this.unqueueUpdateRequest(QueueService.LOW_PRIORITY);
    }
    else {
        if(this.getRequestProperty(priority).length > 0) {
            this.getRequestProperty(priority).forEach(function(reqId) {
                queue.removeRequest(reqId);
            });
            this.getRequestProperty(priority).length = 0;
        }
    }
};

/**
 * @callback updateRequestCallback
 * @argument {external:sdk/request~Response} data
 * @argument {string} url
 */

const completeCallback = (requeue, callback, url, data) => {
    if(!requeue(data))
        callback(data, url);
};
/**
 * Queue a new reocurring update request of the given priority. Removes all
 * existing update requests of this priority.
 * @argument {Array.<string>} urls - An array of URLs to call.
 * @argument {module:queue/service~QueuePriority} priority
 * @argument {module:queue/service~updateRequestCallback} callback - Called
 *                                              whenever a request is done (for
 *                                              each provided URL).
 * @argument {Object.<string,string>} [headers={}] - An object with header-value
 *                                                   pairs to send with the
 *                                                   request.
 * @argument {module:queue/service~requeue} [requeue=(r) => r.status > 499]
 *                                 Determinines if a request should be re-run.
 */
QueueService.prototype.queueUpdateRequest = function(urls, priority, callback, headers = {}, requeue = defaultRequeue) {
    console.log("Requeueing "+priority+" priority update request");
    this.unqueueUpdateRequest(priority);
    let requests = this.getRequestProperty(priority);
    let skips = priority == QueueService.LOW_PRIORITY ? 4 : 0;

    urls.forEach((url) => {
        requests.push(queue.addRequest(
            {
                url: url,
                headers: headers,
                onComplete: completeCallback.bind(null, requeue, callback, url)
            },
            true,
            false,
            skips
        ));
    });
};
