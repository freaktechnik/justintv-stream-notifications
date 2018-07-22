/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/pauseable
 * @requires module:queue
 */
import RequestQueue from './index.js';
import { emit } from "../../utils.js";

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
     * Pauseable queue, pauses based on the network status.
     *
     * @constructs
     * @extends module:queue.RequestQueue
     */
    constructor() {
        super();
        this.paused = false;

        this._listeners = {
            offline: this.pause.bind(this),
            online: this.resume.bind(this)
        };
        for(const l in this._listeners) {
            window.addEventListener(l, this._listeners[l], { passive: true });
        }
    }

    getWorker() {
        const worker = () => {
            if(this.queue.length && !this.paused) {
                return this.getRequest().then(worker);
            }

            this.stopWorker(worker);
        };
        return worker;
    }
    /**
     * Temporarily halt execution of the queue.
     *
     * @fires module:queue/pauseable.PauseableQueue#pause
     * @returns {undefined}
     */
    pause() {
        if(!this.paused) {
            this.paused = true;
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
        if(this.paused) {
            this.paused = false;
            if(this.queue.length) {
                this.startAllWorkers();
            }
            emit(this, "resume");
        }
    }

    _cleanup() {
        for(const l in this._listeners) {
            window.removeEventListener(l, this._listeners[l]);
        }
        this.clear();
    }
}
