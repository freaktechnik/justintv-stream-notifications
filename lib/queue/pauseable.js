/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/pauseable
 * @requires module:queue
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { RequestQueue } = require("./index");
const { NetUtil: { ioService }} = require("resource://gre/modules/NetUtil.jsm");
const events = require("sdk/system/events");

/**
 * @typedef {Object} QueueOptions
 * @property {number} interval - Interval to fetch batches in.
 * @property {number} amount - Percentage of the queue to fetch per batch.
 * @property {number} maxSize - Maximum number of requests per batch.
 */

const PauseableQueue = newClass(
/** @lends module:queue/pauseable.PauseableQueue.prototype */
{
    extends: RequestQueue,
    /**
     * Pauseable queue. Pauses based on the network status.
     * @constructs
     * @extends module:queue.RequestQueue
     */
    initialize() {
        RequestQueue.prototype.initialize.call(this);
        this._queueState = {};
        events.on("network:offline-status-changed", (event) => {
            if(event.data == "offline") {
                this.pause();
            }
            else if(event.data == "online") {
                this.resume();
            }
        }, true);
    },
    /**
     * @type {module:queue/pauseable~QueueOptions?}
     * @private
     */
    _queueState: null,
    /**
     * @type {boolean}
     * @default false
     */
    _configured: false,
    /**
     * @override
     */
    autoFetch(interval, amount = this._queueState.amount, maxSize = this._queueState.maxSize) {
        if(interval > 0) {
            this._queueState = {
                interval,
                amount,
                maxSize
            };
            this._configured = true;
        }
        if(!ioService.offline || interval === 0)
            RequestQueue.prototype.autoFetch.call(this, interval, amount, maxSize);
        else
            this.pause();
    },
    /**
     * Temporarily halt execution of the queue.
     */
    pause() {
        if(this._configured && this.interval !== 0)
            this.autoFetch(0);
    },
    /**
     * Resume the queue.
     */
    resume() {
        if(this._configured) {
            this.autoFetch(this._queueState.interval);
        }
    }
});

exports.PauseableQueue = PauseableQueue;
