/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Queue service for providers
 */

"use strict";

const { UpdateQueue } = require("./queue");

const queue    = new UpdateQueue(),
      services = {};
var qoptions = null;
exports.getServiceForProvider = function(providerName) {
    if(!services.hasOwnProperty(providerName)) {
        services[providerName] = new QueueService();
    }
    return services[providerName];
};

exports.setQueueOptions = function(options) {
    console.log("setting queue options:"+options.toSource());
    qoptions = options;
    queue.autoFetch(options.interval,
                    options.amount,
                    options.maxSize);
};
exports.updateQueueOptions = function(interval) {
    console.log("setting interval to "+interval);
    qoptions.interval = interval;
    queue.changeInterval(interval, qoptions.amount, qoptions.maxSize);
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

QueueService.prototype.queueRequest = function(url, headers, requeue, callback) {
    console.log("Queueing "+url);
    queue.getRequestById(queue.addRequest({
        url: url,
        headers: headers,
        onComplete: (function(data) {
            if(requeue(data))
                this.queueRequest(url, headers, requeue, callback);
            else
                callback(data);
        }).bind(this)
    }, false, true));
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
