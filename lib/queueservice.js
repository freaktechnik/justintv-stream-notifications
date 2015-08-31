/**
 * Queue service for providers
 * @author Martin Giger
 * @license MPL-2.0
 * @module queueservice
 */

"use strict";

const { UpdateQueue } = require("./queue");

const { NetUtil: { ioService }} = require("resource://gre/modules/NetUtil.jsm");
const events = require("sdk/system/events");

const { defer } = require("sdk/core/promise");

const queue    = new UpdateQueue(),
      services = {};
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
 * @return {QueueService}
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
 * Constant for high priority reocurring requests, typically the channel live
 * status.
 * @const {string}
 * @default
 */
QueueService.prototype.HIGH_PRIORITY = QueueService.HIGH_PRIORITY = "high";
/**
 * Constant for low priority reocurring requests, typically the user favorites.
 * @const {string}
 * @default
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
 * @argument {Object} data - An Add-on SDK Request response.
 */
/**
 * Immediately run a request to the given URL.
 * @argument {string} url - The URL to request.
 * @argument {Object.<string, string>} headers - An object with the headers to send.
 * @argument {requeue} requeue - Determines if the request should be re-run
 * @return {Promise} A promise resolving with the Add-on SDK Request response.
 */
QueueService.prototype.queueRequest = function(url, headers, requeue) {
    let { promise, resolve } = defer();

    console.log("Queueing "+url);
    queue.getRequestById(queue.addRequest({
        url: url,
        headers: headers,
        onComplete: (data) => {
            if(requeue(data))
                resolve(this.queueRequest(url, headers, requeue));
            else
                resolve(data);
        }
    }, false, true));

    return promise;
};

/**
 * Unqueues an all update requests of the given priority.
 * @argument {QueueService.LOW_PRIORITY|QueueService.HIGH_PRIORITY} priority
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
 * @argument {Object} data - An Add-on SDK Response object.
 */
/**
 * Queue a new reocurring update request of the given priority. Removes all existing
 * update requests of this priority.
 * @argument {Array.<string>} urls - An array of URLs to call.
 * @argument {Object.<string,string>} headers - A headers object to send with each request.
 * @argument {QueueService.LOW_PRIORITY|QueueService.HIGH_PRIORITY} priority
 * @argument {requeue} requeue: Determinines if a request should be re-run.
 * @argument {updateRequestCallback} callback - Called whenever a request is done
 *                                             (for each provided URL).
 */
QueueService.prototype.queueUpdateRequest = function(urls, headers, priority, requeue, callback) {
    console.log("Requeueing "+priority+" priority update request");
    this.unqueueUpdateRequest(priority);

    urls.forEach(function(url) {
        this.getRequestProperty(priority).push(queue.addRequest(
            {
                url: url,
                headers: headers,
                onComplete: function(data) {
                    if(!requeue(data)) callback(data, url);
                }
            },
            true,
            false,
            priority == QueueService.LOW_PRIORITY ? 4 : 0
        ));
    }, this);
};
