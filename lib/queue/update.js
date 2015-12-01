/**
 * Queue with priorized, persistant and less often fetched requests.
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/update
 * @requires module:queue/pauseable
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { PauseableQueue } = require("./pauseable");

/**
 * Fired when there is a new priorized item added to the queue.
 * @event module:queue/update.UpdateQueue#queuepriorized
 */
/**
 * Fired when all priorized items in the queue were fetched.
 * @event module:queue/update.UpdateQueue#allpriorizedloaded
 */

const UpdateQueue = newClass(
/** @lends module:queue/update.UpdateQueue.prototype */
{
    extends: PauseableQueue,
    /**
     * A queue with priorized, persistent and less often fetched requests.
     * @constructs
     * @argument {Object.<string,function>} options - Event listener options object
     * @extends module:queue/pauseable.PauseableQueue
     */
    initialize(options) {
        PauseableQueue.prototype.initialize.call(this, options);
    },
    /**
     * Add a request to the queue
     * @argument {external:sdk/request.RequestOptions} requestOptions
     * @argument {boolean} [persistent = false] - If the request should be
     *                                            readded to the queue whenever
     *                                            it was fetched.
     * @argument {boolean} [priorized = false] - If the request should be
     *                                           priorized over other requests
     *                                           in the queue. Can not be true
     *                                           when the request is persistent
     *                                           and not skipping.
     * @argument {number} [skip=0] - Number of times to skip this request before
     *                               fetching it.
     * @return {number} ID of the added request.
     * @fires module:queue/update.UpdateQueue#queuepriorized
     */
    addRequest(requestArgs, persistent = false, priorized = false, skip = 0) {
        // only allow priorized if its either not a persistent request or it skips
        // skipping requests are only priorized for the first time the are actually sent
        // however they will the first time not skip.
        priorized = priorized && (!persistent || skip > 0);

        if(!this.containsPriorized() && priorized) {
            emit(this, "queuepriorized");
        }
        return PauseableQueue.prototype.addRequest.call(this, Object.assign({
            persist: persistent,
            priorize: priorized,
            skip,
            skipped: 0
        }, requestArgs));
    },
    /**
     * Fetch multiple requests from the top of the queue.
     * @argument {number} batchSize - Number of requests to get
     * @fires module:queue/update.UpdateQueue#allpriorizedloaded
     */
    getRequest: function(index) {
        if(this.getFirstPriorized()) {
            if(!this.containsPriorized()) {
                emit(this, "allpriorizedloaded");
            }
        }
        else {
            this.getRequestByIndex(index);
        }
    },
    /**
     * Fetch the first priorized request in the queue.
     * @return {boolean} If a priorized request was fetched.
     */
    getFirstPriorized() {
        return this.queue.some((req, i) => {
            if(req.priorize) {
                this.getRequestByIndex(i);
                return true;
            }
            return false;
        });
    },
    /**
     * Fetch the request at the given index.
     * @argument {number} index - Index in the queue of the request.
     */
    getRequestByIndex(index) {
        console.info(this.queue.length+" jobs left in the queue.");
        if(this.queue[index].skip > this.queue[index].skipped &&
           !this.queue[index].priorize) {
            console.log("[Queue]> Skipping "+this.queue[index].url);
            this.queue[index].skipped++;

            this.queue.push(this.queue.splice(index,1)[0]);
        }
        else {
            console.log("[Queue]> Getting "+this.queue[index].url);

            let req = PauseableQueue.prototype.getRequest.call(this, index);
            if(req.persist) {

                // explication of the skipping logic in the addRequest method
                if(req.skip > 0) {
                    req.skipped = 0;
                    if(req.priorize) {
                        req.priorize = false;
                    }
                }

                this.queue.push(req);
            }
        }
    },
    /**
     * Check if the queue has a priorized request waiting.
     * @return {boolean} Whether there is a priorized request in the queue.
     */
    containsPriorized() {
        return this.queue.some((item) => item.priorize);
    },
    /**
     * Fetch all priorized requests.
     * @fires module:queue/update.UpdateQueue#allpriorizedloaded
     */
    getAllPriorized() {
        this.queue.filter((req) => req.priorize).forEach(() => {
            this.getFirstPriorized();
        });
        emit(this, "allpriorizedloaded");
    },
    /**
     * @override
     */
    resume() {
        PauseableQueue.prototype.resume.call(this);
        if(this.containsPriorized()) {
            this.getAllPriorized();
        }
    }
});

exports.UpdateQueue = UpdateQueue;
