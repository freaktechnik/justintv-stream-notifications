/* eslint-disable jsdoc/require-param */
/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/pauseable
 * @requires module:queue
 */
import RequestQueue from "./index";
import { emit } from "../../utils";

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
     * @type {boolean}
     * @default false
     */
    _configured = false;
    /**
     * Pauseable queue, pauses based on the network status.
     *
     * @constructs
     * @extends module:queue.RequestQueue
     */
    constructor() {
        super();

        /**
         * @type {module:queue/pauseable~QueueOptions?}
         * @private
         */
        this._queueState = {};

        window.addEventListener("offline", () => this.pause(), { passive: true });
        window.addEventListener("online", () => this.resume(), { passive: true });
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
        if(navigator.onLine || interval === 0) {
            super.autoFetch(interval, amount, maxSize);
        }
        else {
            this.pause();
        }
    }
    /**
     * Temporarily halt execution of the queue.
     *
     * @fires module:queue/pauseable.PauseableQueue#pause
     * @returns {undefined}
     */
    pause() {
        if(this._configured && this.interval !== 0) {
            this.autoFetch(0);
            emit(this, "pause");
        }
    }
    /**
     * Resume the queue.
     *
     * @fires module:queue/pauseable.PauseableQueue#resume
     * @returns {undefined}
     */
    resume() {
        if(this._configured) {
            this.autoFetch(this._queueState.interval);
            emit(this, "resume");
        }
    }
}
