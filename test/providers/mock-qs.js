/**
 * Mock QueueServices for usage in tests.
 * @author Martin Giger
 * @license MPL-2.0
 * @module test/providers/mock-qs
 */

const { defer } = require("sdk/core/promise");
const qs = require("sdk/querystring");
const mockAPIEnpoints = require("./mockAPI.json");

/**
 * Get an API response from the mock APIs.
 * @param {string} type - Provider type
 * @param {string} url - API endpoint URL
 * @return {external:Response} Response to the request on the API.
 */
const getRequest = (type, url)  => {
    if(type === "youtube") {
        const u = url.split("?");
        u[1] = qs.parse(u[1]);
        delete u[1].part;
        if("fields" in u[1])
            delete u[1].fields;
        if("hl" in u[1])
            delete u[1].hl;
        if("relevanceLanguage" in u[1])
            delete u[1].relevanceLanguage;
        delete u[1].key;

        u[1] = qs.stringify(u[1]);

        url = u.join("?");
    }
    else if(type == "douyutv") {
        url = url.split("?")[0];
    }

    console.log("Getting", url);
    if(type in mockAPIEnpoints && url in mockAPIEnpoints[type]) {
        return {
            status: 200,
            json: mockAPIEnpoints[type][url],
            text: typeof mockAPIEnpoints[type][url] === "string" ?
                mockAPIEnpoints[type][url] :
                JSON.stringify(mockAPIEnpoints[type][url])
        };
    }
    else {
        return {
            status: 404
        };
    }
};

/**
 * Get a QS that returns API responses from the mock endpoints.
 * @param {module:queue/service.QueueService} originalQS
 * @param {string} type - Provider type
 * @param {boolean} [active=true] - If queued requests should resolve.
 * @return {module:queue/service.QueueService} A QS that resolves to mock
 *                                             endpoints.
 */
const getMockAPIQS = (originalQS, type, active = true) => {
    return {
        queueRequest(url) {
            return Promise.resolve(getRequest(type, url));
        },
        unqueueUpdateRequest(priority) {},
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
exports.getMockAPIQS = getMockAPIQS;

/**
 * @typedef {module:queue/service.QueueService} MockQS
 * @property {Promise} promise - Promise that resolves whenever a request gets
 *                               resolved.
 */

/**
 * Get a QS that resolves every request and at the same time resolves a promise.
 * @param {module:queue/service.QueueService} originalQS
 * @param {boolean} [ignoreQR=false] - If calls to queueRequest should not
 *                                     affect the promise.
 * @return {MockQS} A QS with an extra property holding a promise that resolves
 *                  whenever a request gets resolved.
 */
const getMockQS = (originalQS, ignoreQR = false) => {
    let { promise, resolve, reject } = defer();
    return {
        queueRequest(url) {
            if(!ignoreQR)
                resolve(url);
            return Promise.resolve({});
        },
        unqueueUpdateRequest(priority) {
            resolve(priority);
        },
        queueUpdateRequest(urls, priority, callback) {
            resolve({
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
exports.getMockQS = getMockQS;

const endpoints = Object.keys(mockAPIEnpoints);
exports.apiEndpoints = endpoints;

/**
 * These are either defunct providers, or providers that don't use polling
 * (or beam, which I should switch to sockets)
 * @type {Array.<string>}
 */
const IGNORE_QSUPDATE_PROVIDERS = [ "picarto", "beam" ];
exports.IGNORE_QSUPDATE_PROVIDERS = IGNORE_QSUPDATE_PROVIDERS;

