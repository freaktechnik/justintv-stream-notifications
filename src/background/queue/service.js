/**
 * Queue service for providers. Provides a separated management for requests by
 * provider, all in the same {@link module:queue/update.UpdateQueue}.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module queue/service
 * @requires module:queue/update
 */

import UpdateQueue from "./update.js";
import prefs from "../../preferences.js";

const queue = new UpdateQueue(),
    services = {},
    NOT_FOUND = 404,
    GONE = 420,
    defaultRequeue = (response) => !response.ok && response.status !== NOT_FOUND && response.status !== GONE,
    S_TO_MS = 1000,
    NO_ATTEMPTS = 0,
    HIGH_PRIORITY_TIME_FACTOR = 1,
    LOW_PRIORITY_TIME_FACTOR = 4;


/**
 * @callback updateRequestCallback
 * @param {module:queue~Response} data
 * @param {string} url
 */
/**
 * @typedef {Object} UpdateReuqest
 * @property {module:providers/generic-provider~GetURLs} getURLs
 * @property {module:queue/service~updateRequestCallback} onComplete
 * @property {module:queue/service~QueuePriority} [priority=QueueService.HIGH_PRIORITY]
 * @property {Object} [headers={}]
 * @property {module:queue/service~requeue} [requeue=defaultRequeue]
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
    constructor(type) {
        this.type = type;
    }

    HIGH_PRIORITY = QueueService.HIGH_PRIORITY;
    LOW_PRIORITY = QueueService.LOW_PRIORITY;

    /**
     * Returns the request ID array for the specified priority.
     *
     * @private
     * @param {module:queue-service~QueuePriority} priority - Priority to get
     *                                                        the array for.
     * @returns {Array} Array of request IDs.
     */
    getRequestProperty(priority) {
        return `${priority}PriorityRequestListener`;
    }

    /**
     * @private
     * @param {module:queue-service~QueuePriority} priority - Priority of the alarm.
     * @returns {string} Name of the alarm for the priority.
     */
    getAlarmName(priority) {
        return this.type + priority;
    }

    /**
     * @type {Promise.<number>} ms to wait between requests.
     * @readonly
     */
    get interval() {
        return prefs.get('updateInterval').then((i) => i * S_TO_MS);
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
     * @param {Object.<string>} [headers={}] - An object with the headers
     *                                                 to send.
     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
     *                             - Determines if the request should be re-run.
     * @param {boolean} [priorized=true] - If the request should be priorized.
     * @param {number} [attempt=0] - Counter to avoid requeuing infinitely.
     * @returns {Promise} A promise resolving with the Request response.
     */
    queueRequest(url, headers = {}, requeue = defaultRequeue, priorized = true, attempt = NO_ATTEMPTS) {
        return new Promise((resolve, reject) => {
            queue.addRequest({
                url,
                headers: new Headers(headers),
                onComplete: (data) => {
                    if(requeue(data)) {
                        prefs.get("queueservice_maxRetries")
                            .then((maxRetries) => {
                                if(attempt < maxRetries) {
                                    resolve(this.queueRequest(url, headers, requeue, true, ++attempt));
                                }
                                else {
                                    throw new Error("Too many attempts");
                                }
                            })
                            .catch(reject);
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
            const requestListener = this.getRequestProperty(priority);
            browser.alarms.onAlarm.removeListener(this[requestListener]);
            browser.alarms.clear(this.getAlarmName(priority));
            this[requestListener] = undefined;
            //TODO should also remove requests that were already queued and pending.
        }
    }
    /**
     * Queue a new reocurring update request of the given priority. Removes all
     * existing update requests of this priority.
     *
     * @param {module:queue/service~UpdateReuqest} config - Configuration.
     * @returns {undefined}
     */
    queueUpdateRequest({
        getURLs, priority = QueueService.HIGH_PRIORITY, onComplete, headers = {}, requeue = defaultRequeue
    }) {
        if(this.hasUpdateRequest(priority)) {
            this.unqueueUpdateRequest(priority);
        }

        const alarmName = this.getAlarmName(priority),
            requestListener = this.getRequestProperty(priority),
            intervalModifier = priority === QueueService.HIGH_PRIORITY ? HIGH_PRIORITY_TIME_FACTOR : LOW_PRIORITY_TIME_FACTOR;

        this[requestListener] = async (alarm) => {
            if(alarm.name === alarmName) {
                try {
                    const urls = await getURLs();
                    if(!urls.length) {
                        this.unqueueUpdateRequest(priority);
                        return;
                    }
                    const promises = urls.map((url) => this.queueRequest(url, headers, requeue, false).then((result) => onComplete(result, url))
                        .catch((e) => console.error("Error during", priority, "update request", url, "for", this.type, ":", e)));
                    await Promise.all(promises);
                }
                catch(e) {
                    console.error("Error during", priority, "uipdate request for", this.type, ":", e);
                }
                finally {
                    const interval = await this.interval;
                    browser.alarms.create(alarmName, {
                        when: Date.now() + (interval * intervalModifier)
                    });
                }
            }
        };
        browser.alarms.onAlarm.addListener(this[requestListener]);
        this[requestListener]({ name: alarmName });
        return this.interval.then((interval) => {
            browser.alarms.create(alarmName, {
                when: Date.now() + (interval * intervalModifier)
            });
        });
    }

    hasUpdateRequest(priority) {
        return this[this.getRequestProperty(priority)] !== undefined;
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
export const addListeners = ({
    paused, resumed
}) => {
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
export const removeListeners = ({
    paused, resumed
}) => {
    if(paused) {
        queue.removeEventListener("pause", paused);
    }
    if(resumed) {
        queue.removeEventListener("resume", resumed);
    }
};
