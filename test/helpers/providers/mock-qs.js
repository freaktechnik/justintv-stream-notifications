/**
 * Mock QueueServices for usage in tests.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module test/providers/mock-qs
 * @todo Switch to using the fetch shim instead.
 */
import mockAPIEnpoints from "./mockAPI.json";

/**
 * Get an API response from the mock APIs.
 *
 * @param {string} type - Provider type.
 * @param {string} url - API endpoint URL.
 * @returns {external:Response} Response to the request on the API.
 */
const getRequest = (type, url) => {
    if(type === "youtube") {
        const u = url.split("?");
        u[1] = new URLSearchParams(u[1]);
        u[1].delete('part');
        if(u[1].has("fields")) {
            u[1].delete("fields");
        }
        if(u[1].has("hl")) {
            u[1].delete("hl");
        }
        if(u[1].has("relevanceLanguage")) {
            u[1].delete("relevanceLanguage");
        }
        u[1].delete("key");

        u[1] = u[1].toString();

        url = u.join("?");
    }
    else if(type == "douyutv") {
        url = url.split("?")[0];
    }

    if(type in mockAPIEnpoints && url in mockAPIEnpoints[type]) {
        return {
            status: 200,
            parsedJSON: mockAPIEnpoints[type][url],
            text() {
                return Promise.resolve(
                    typeof mockAPIEnpoints[type][url] === "string"
                        ? mockAPIEnpoints[type][url]
                        : JSON.stringify(mockAPIEnpoints[type][url])
                );
            },
            ok: true
        };
    }
    else {
        return {
            status: 404,
            ok: false
        };
    }
};

/**
 * Get a QS that returns API responses from the mock endpoints.
 *
 * @param {module:queue/service.QueueService} originalQS - Real QS for the
 *                                                         provider.
 * @param {string} type - Provider type.
 * @param {boolean} [active=true] - If queued requests should resolve.
 * @returns {module:queue/service.QueueService} A QS that resolves to mock
 *                                              endpoints.
 */
const getMockAPIQS = (originalQS, type, active = true) => {
    return {
        queueRequest(url) {
            return Promise.resolve(getRequest(type, url));
        },
        unqueueUpdateRequest() {
            // nothing to do here.
        },
        queueUpdateRequest(urls, priority, callback) {
            if(active) {
                urls.forEach((url) => {
                    callback(getRequest(type, url), url);
                });
            }
        },
        HIGH_PRIORITY: originalQS.HIGH_PRIORITY,
        LOW_PRIORITY: originalQS.LOW_PRIORITY
    };
};

/**
 * @typedef {module:queue/service.QueueService} MockQS
 * @property {Promise} promise - Promise that resolves whenever a request gets
 *                               resolved.
 */

/**
 * Get a QS that resolves every request and at the same time resolves a promise.
 *
 * @param {module:queue/service.QueueService} originalQS - Original QS of the
 *                                                         provider.
 * @param {boolean} [ignoreQR=false] - If calls to queueRequest should not
 *                                     affect the promise.
 * @returns {MockQS} A QS with an extra property holding a promise that resolves
 *                  whenever a request gets resolved.
 */
const getMockQS = (originalQS, ignoreQR = false) => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
        resolvePromise = resolve;
    });
    return {
        queueRequest(url) {
            if(!ignoreQR) {
                resolvePromise(url);
            }
            return Promise.resolve({
                ok: false
            });
        },
        unqueueUpdateRequest(priority) {
            resolvePromise(priority);
        },
        queueUpdateRequest(urls, priority, callback) {
            resolvePromise({
                urls,
                priority,
                callback
            });
        },
        promise,
        HIGH_PRIORITY: originalQS.HIGH_PRIORITY,
        LOW_PRIORITY: originalQS.LOW_PRIORITY
    };
};

const endpoints = Object.keys(mockAPIEnpoints);

/**
 * These are either defunct providers, or providers that don't use polling
 * (or beam, which I should switch to sockets).
 *
 * @type {Array.<string>}
 */
const IGNORE_QSUPDATE_PROVIDERS = [ "picarto", "beam" ];

export { getMockQS, getMockAPIQS, endpoints as apiEndpoints, IGNORE_QSUPDATE_PROVIDERS };
