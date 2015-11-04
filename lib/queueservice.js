/**
 * Queue service for providers. Provides a separated management for requests by
 * provider, all in the same {@link module:queue.UpdateQueue}.
 * @author Martin Giger
 * @license MPL-2.0
 * @module queueservice
 * @requires module:queue
 * @hastests
 */

"use strict";

const { UpdateQueue } = require("./queue");

const { NetUtil: { ioService }} = require("resource://gre/modules/NetUtil.jsm");
const events = require("sdk/system/events");

const { defer } = require("sdk/core/promise");
const { prefs} = require("sdk/simple-prefs");

const queue = new UpdateQueue();
let services = {};
const defaultRequeue = (response) => response.status > 499;
var qoptions = {};

events.on("network:offline-status-changed", function(event) {
    if(event.data == "offline") {
        exports.pause();
    }
    else if(event.data == "online") {
        exports.resume();
    }
}, true);

/**
 * Get a QueueService for the usage in a provider
 * @argument {string} providerName - The type of the provider
 * @return {module:queuservice~QueueService}
 */
exports.getServiceForProvider = function(providerName) {
    if(!services.hasOwnProperty(providerName)) {
        services[providerName] = new QueueService();
    }
    return services[providerName];
};

exports.setQueueOptions = function(options) {
    console.log("setting queue options:"+options.toSource());
    qoptions = options;

    if(ioService.offline) {
        this.pause();
    }
    else {
        queue.autoFetch(options.interval,
                        options.amount,
                        options.maxSize);
    }
};
exports.updateQueueOptions = function(interval) {
    console.log("setting interval to "+interval);
    qoptions.interval = interval;

    if(ioService.offline) {
        this.pause();
    }
    else {
        this.resume();
    }
};
exports.pause = function() {
    queue.changeInterval(0);
};
exports.resume = function() {
    if(qoptions)
        queue.changeInterval(qoptions.interval, qoptions.amount, qoptions.maxSize);
};
exports.addQueueListeners = function(containsPriorized, priorizedLoaded) {
    if(containsPriorized)
        queue.on("queuepriorized", containsPriorized);
    if(priorizedLoaded)
        queue.on("allpriorizedloaded", priorizedLoaded);
};

exports.removeQueueListeners = function(containsPriorized, priorizedLoaded) {
    if(containsPriorized)
        queue.off("queuepriorized", containsPriorized);
    if(priorizedLoaded)
        queue.off("allpriorizedloaded", priorizedLoaded);
};

/**
 * @typedef QueuePriority
 * @type {string}
 * @see {@link module:queueservice~QueueService.HIGH_PRIORITY} and {@link module:queueservice~QueueService.LOW_PRIORITY}
 */
/**
 * Constant for high priority reocurring requests, typically the channel live
 * status.
 * @const {module:queueservice~QueuePriority}
 * @default "high"
 * @alias module:queueservice~QueueService.HIGH_PRIORITY
 */
QueueService.prototype.HIGH_PRIORITY = QueueService.HIGH_PRIORITY = "high";
/**
 * Constant for low priority reocurring requests, typically the user favorites.
 * @const {module:queueservice~QueuePriority}
 * @default "low"
 * @alias module:queueservice~QueueService.LOW_PRIORITY
 */
QueueService.prototype.LOW_PRIORITY = QueueService.LOW_PRIORITY  = "low";

/** @private */
QueueService.prototype.highPriorityRequestIds = [];
/** @private */
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

/** @private */
QueueService.prototype.getRequestProperty = function(priority) {
    return this[priority+"PriorityRequestIds"];
};

/**
 * @callback requeue
 * @argument {external:sdk/request~Response} data
 */
/**
 * Immediately run a request to the given URL.
 * @argument {string} url - The URL to request.
 * @argument {Object.<string, string>} [headers={}] - An object with the headers
 *                                                    to send.
 * @argument {module:queueservice~requeue} [requeue=(r) => r.status > 499]
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

    if(attempt === 0)
        queue.getRequestById(id);

    return promise;
};

/**
 * Unqueues an all update requests of the given priority.
 * @argument {module:queueservice~QueuePriority} priority
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
 */
/**
 * Queue a new reocurring update request of the given priority. Removes all
 * existing update requests of this priority.
 * @argument {Array.<string>} urls - An array of URLs to call.
 * @argument {module:queueservice~QueuePriority} priority
 * @argument {module:queueservice~updateRequestCallback} callback - Called
 *                                              whenever a request is done (for
 *                                              each provided URL).
 * @argument {Object.<string,string>} [headers={}] - An object with header-value
 *                                                   pairs to send with the
 *                                                   request.
 * @argument {module:queueservice~requeue} [requeue=(r) => r.status > 499]
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
                onComplete: (data) => {
                    if(!requeue(data)) callback(data, url);
                }
            },
            true,
            false,
            skips
        ));
    });
};
