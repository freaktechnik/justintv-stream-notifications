/**
 * Queue service for providers. Provides a separated management for requests by
 * provider, all in the same {@link module:queue/update.UpdateQueue}.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/service
 * @requires module:queue/update
 */

import UpdateQueue from "./update";
import prefs from "../../preferences";

const queue = new UpdateQueue(),
    services = {},
    defaultRequeue = (response) => !response.ok && response.status !== 404 && response.status !== 420;


/**
 * @callback updateRequestCallback
 * @param {external:sdk/request~Response} data
 * @param {string} url
 */

/**
 * A service providing methods for a provider to place one-time and reocurring
 * requests.
 *
 * @class
 */
class QueueService {
    static HIGH_PRIORITY = "high";
    static LOW_PRIORITY = "low";
    HIGH_PRIORITY = QueueService.HIGH_PRIORITY;
    LOW_PRIORITY = QueueService.LOW_PRIORITY;
    constructor(type) {
        this.type = type;
    }

    /**
     * Returns the request ID array for the specified priority.
     *
     * @private
     * @param {module:queue-service~QueuePriority} priority - Priority to get
     *                                                        the array for.
     * @returns {Array} Array of request IDs.
     */
    getRequestProperty(priority) {
        return priority + "PriorityRequestListener";
    }

    getAlarmName(priority) {
        return this.type + priority;
    }

    get interval() {
        return prefs.get('updateInterval');
    }

    /**
     * Determines if the request has to be requeued due to errors.
     *
     * @callback requeue
     * @param {external:sdk/request~Response} data - Response that was returned.
     * @returns {boolean} When true, the request will be queued again.
     */
    /**
     * Immediately run a request to the given URL.
     *
     * @param {string} url - The URL to request.
     * @param {Object.<string, string>} [headers={}] - An object with the headers
     *                                                 to send.
     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
     *                             - Determines if the request should be re-run.
     * @param {number} [attempt=0] - Counter to avoid requeuing infinitely.
     * @returns {Promise} A promise resolving with the Request response.
     */
    queueRequest(url, headers = {}, requeue = defaultRequeue, priorized = true, attempt = 0) {
        return new Promise((resolve, reject) => {
            const id = queue.addRequest({
                url,
                headers: new Headers(headers),
                onComplete: (data) => {
                    if(requeue(data)) {
                        prefs.get("queueservice_maxRetries").then((maxRetries) => {
                            if(attempt < maxRetries) {
                                resolve(this.queueRequest(url, headers, requeue, true, ++attempt));
                            }
                            else {
                                reject("Too many attempts");
                            }
                        });
                    }
                    else {
                        resolve(data);
                    }
                },
                onError: reject
            }, priorized);
        });
    }

    /**
     * Unqueues an all update requests of the given priority. If none is given,
     * all update requests are unqueued.
     *
     * @param {module:queue/service~QueuePriority?} priority - Priority of
     *                                                      reuqests to unqueue.
     * @returns {undefined}
     */
    unqueueUpdateRequest(priority) {
        if(!priority) {
            this.unqueueUpdateRequest(QueueService.HIGH_PRIORITY);
            this.unqueueUpdateRequest(QueueService.LOW_PRIORITY);
        }
        else {
            browser.alarms.onAlarm.removeListeners(this[this.getRequestProperty(priority)]);
            browser.alarms.clear(this.getAlarmName(priority));
            //TODO should also remove requests that were already queued and pending.
        }
    }
    /**
     * Queue a new reocurring update request of the given priority. Removes all
     * existing update requests of this priority.
     *
     * @param {Array.<string>} urls - An array of URLs to call.
     * @param {module:queue/service~QueuePriority} priority - Priority to queue
     *                                                        the request as.
     * @param {module:queue/service~updateRequestCallback} callback - Called
     *                                           whenever a request is done (for
     *                                           each provided URL).
     * @param {Object.<string,string>} [rawHeaders={}] - An object with header-value
     *                                                pairs to send with the
     *                                                request.
     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
     *                             - Determinines if a request should be re-run.
     * @returns {undefined}
     */
    queueUpdateRequest({ getURLs, priority = QueueService.HIGH_PRIORITY, onComplete, headers = {}, requeue = defaultRequeue) {
        this.unqueueUpdateRequest(priority);

        const alarmName = this.getAlarmName(priority);
        const requestListener = this.getRequestProperty(priority);

        this[requestListener] = async (alarm) => {
            if(alarm.name === alarmName) {
                const urls = await getURLs();
                if(!urls.length) {
                    this.unqueueUpdateRequest(priority);
                    return;
                }
                const promises = urls.map((url) => this.queueRequest(url, headers, requeue, false).then((result) => {
                    onComplete(result, url);
                });
                await Promise.all(promises);
                const interval = await this.interval();
                browser.alarms.create(alarmName, {
                    when: Date.now() + interval * 1000
                });
            }
        };
        browser.alarms.onAlarm.addListener(this[requestListener]);
        this.interval().then((interval) => {
            browser.alarms.create(alarmName, {
                when: Date.now() + interval * 1000
            });
        })
    }
}

/**
 * Get a QueueService for the usage in a provider.
 *
 * @param {string} providerName - The type of the provider.
 * @returns {module:queue/service~QueueService} QueueService for the provider.
 */
export const getServiceForProvider = (providerName) => {
    if(!services.hasOwnProperty(providerName)) {
        services[providerName] = new QueueService(providerName);
    }
    return services[providerName];
};

/**
 * Pause the internal queue.
 *
 * @returns {undefined}
 */
export const pause = () => {
    queue.pause();
};

/**
 * Resume the internal queue.
 *
 * @returns {undefined}
 */
export const resume = () => {
    queue.resume();
};

/**
 * @typedef {Object} QueueServiceListener
 * @property {function} paused
 * @property {function} resumed
 */

/**
 * Add event listeners to the internal queue.
 *
 * @param {module:queue/service~QueueServiceListener} listeners - Listeners to add.
 * @returns {undefined}
 */
export const addListeners = ({ paused, resumed }) => {
    if(paused) {
        queue.addEventListener("pause", paused);
    }
    if(resumed) {
        queue.addEventListener("resume", resumed);
    }
};

/**
 * Remove event listeners from the internal queue.
 *
 * @param {module:queue/service~QueueServiceListener} listeners - Listeners to
 *        remove.
 * @returns {undefined}
 */
export const removeListeners = ({ paused, resumed }) => {
    if(paused) {
        queue.removeEventListener("pause", paused);
    }
    if(resumed) {
        queue.removeEventListener("resume", resumed);
    }
};
