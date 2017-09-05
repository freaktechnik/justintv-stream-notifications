/**
 * Queue with priorized, persistant and less often fetched requests.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/update
 * @requires module:queue/pauseable
 */
import PauseableQueue from "./pauseable";

/**
 * @class module:queue/update.UpdateQueue
 * @extends module:queue/pauseable.PauseableQueue
 */
export default class UpdateQueue extends PauseableQueue {
    /**
     * A queue with priorized and less often fetched requests.
     *
     * @constructs
     */
    constructor() {
        super();
    }
    /**
     * Add a request to the queue.
     *
     * @param {external:sdk/request.RequestOptions} requestArgs - Requst Arguments.
     * @param {boolean} [priorized=false] - If the request should be priorized
     *                                        over other requests in the queue.
     * @returns {number} Request id.
     * @fires module:queue/update.UpdateQueue#queuepriorized
     */
    addRequest(requestArgs, priorized = false) {
        return super.addRequest(Object.assign({
            priorize: priorized
        }, requestArgs));
    }
    /**
     * Fetch multiple requests from the top of the queue.
     *
     * @param {number} index - Index of the request to fetch.
     * @fires module:queue/update.UpdateQueue#allpriorizedloaded
     * @returns {undefined}
     */
    getNextRequest() {
        if(this.containsPriorized {
            return this.getFirstPriorized();
        }
        return super.getNextRequest();
    }
    /**
     * Fetch the first priorized request in the queue.
     *
     * @returns {boolean} If a priorized request was fetched.
     */
    getFirstPriorized() {
        let request;
        this.queue = this.queue.filter((req) => {
            if(!request && req.priorize) {
                request = req;
                return true;
            }
            return false;
        });
        return request;
    }
    /**
     * Check if the queue has a priorized request waiting.
     *
     * @type {boolean}
     * @readonly
     */
    get containsPriorized() {
        return this.queue.some((item) => item.priorize);
    }
}
