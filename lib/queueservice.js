/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Queue service for providers
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

QueueService.prototype.HIGH_PRIORITY = QueueService.HIGH_PRIORITY = "high";
QueueService.prototype.LOW_PRIORITY = QueueService.LOW_PRIORITY  = "low";

QueueService.prototype.highPriorityRequestIds = [];
QueueService.prototype.lowPriorityRequestIds = [];
function QueueService() {
    this.highPriorityRequestIds = [];
    this.lowPriorityRequestIds = [];
}

QueueService.prototype.getRequestProperty = function(priority) {
    return this[priority+"PriorityRequestIds"];
};

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
