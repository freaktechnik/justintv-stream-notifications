/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/pauseable
 * @requires module:queue
 */
"use strict";

import { Class as newClass } from "sdk/core/heritage";
import RequestQueue from "./index";
import { NetUtil: { ioService }} from "resource://gre/modules/NetUtil.jsm";
import * as events from "sdk/system/events";
import { EventTarget } from "sdk/event/target";
import { emit, setListeners } from "sdk/event/core";

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

export default const PauseableQueue = newClass(
/** @lends module:queue/pauseable.PauseableQueue.prototype */
{
    extends: RequestQueue,
    implements: [ EventTarget ],
    /**
     * Pauseable queue. Pauses based on the network status.
     * @constructs
     * @extends module:queue.RequestQueue
     * @implements external:sdk/event/target.EventTarget
     */
    initialize(options) {
        setListeners(options);
        RequestQueue.prototype.constructor.call(this);

        this._queueState = {};
        events.on("network:offline-status-changed", (event) => {
            /* istanbul ignore else */
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
     * @type {boolean}
     * @default false
     * @readonly
     */
    get paused() {
        return this.interval === 0;
    },
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
     * @fires module:queue/pauseable.PauseableQueue#pause
     */
    pause() {
        if(this._configured && this.interval !== 0) {
            this.autoFetch(0);
            emit(this, "pause");
        }
    },
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
});
