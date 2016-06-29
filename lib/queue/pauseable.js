/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/pauseable
 * @requires module:queue
 */
"use strict";

import RequestQueue from "./index";
import { NetUtil } from "resource://gre/modules/NetUtil.jsm";
import events from "sdk/system/events";
import { emit } from "sdk/event/core";

/**
 * @typedef {Object} QueueOptions
 * @property {number} interval - Interval to fetch batches in.
 * @property {number} amount - Percentage of the queue to fetch per batch.
 * @property {number} maxSize - Maximum number of requests per batch.
 */

/**
 * @event module:queue/pauseable.PauseableQueue#pause
 */
/**
 * @event module:queue/pauseable.PauseableQueue#resume
 */

/**
 * @class
 * @extends module:queue.RequestQueue
 */
export default class PauseableQueue extends RequestQueue {
    /**
     * Pauseable queue. Pauses based on the network status.
     * @constructs
     * @extends module:queue.RequestQueue
     * @implements external:sdk/event/target.EventTarget
     */
    constructor(options) {
        super(options);

        /**
         * @type {module:queue/pauseable~QueueOptions?}
         * @private
         */
        this._queueState = {};

        /**
         * @type {boolean}
         * @default false
         */
        this._configured = false;
        events.on("network:offline-status-changed", (event) => {
            /* istanbul ignore else */
            if(event.data == "offline") {
                this.pause();
            }
            else if(event.data == "online") {
                this.resume();
            }
        }, true);
    }
    /**
     * @type {boolean}
     * @default false
     * @readonly
     */
    get paused() {
        return this.interval === 0;
    }
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
        if(!NetUtil.ioService.offline || interval === 0)
            RequestQueue.prototype.autoFetch.call(this, interval, amount, maxSize);
        else
            this.pause();
    }
    /**
     * Temporarily halt execution of the queue.
     * @fires module:queue/pauseable.PauseableQueue#pause
     */
    pause() {
        if(this._configured && this.interval !== 0) {
            this.autoFetch(0);
            emit(this, "pause");
        }
    }
    /**
     * Resume the queue.
     * @fires module:queue/pauseable.PauseableQueue#resume
     */
    resume() {
        if(this._configured) {
            this.autoFetch(this._queueState.interval);
            emit(this, "resume");
        }
    }
}
