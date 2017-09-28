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
 * A queue with priorized and less often fetched requests.
 *
 * @class module:queue/update.UpdateQueue
 * @extends module:queue/pauseable.PauseableQueue
 */
export default class UpdateQueue extends PauseableQueue {
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
     * @returns {undefined}
     */
    getNextRequest() {
        if(this.containsPriorized) {
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
                return false;
            }
            return true;
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
