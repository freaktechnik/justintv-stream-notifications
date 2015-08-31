/**
 * Pagination helper for APIs with pagination
 * @module pagination-helper
 * @author Martin Giger
 * @license MPL-2.0
 */

"use strict";

let { defer } = require("sdk/core/promise");

PaginationHelper.prototype.url = "localhost/";
PaginationHelper.prototype.page = 0;
PaginationHelper.prototype.pageSize = 100;
PaginationHelper.prototype.result = [];
PaginationHelper.prototype.request = null;
PaginationHelper.prototype.fetchNextPage = null;
PaginationHelper.prototype.onComplete = null;
PaginationHelper.prototype.getItems = null;
PaginationHelper.prototype.getPageNumber = function(page, pageSize, data) {
    return page += pageSize;
};

/**
 * Add-on SDK Response object
 * @external sdk/request.Response
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Response}
 */
/**
 * A function running a request on the provided URL and then calling the
 * callback function.
 * @callback request
 * @argument {string} url
 * @argument {function} callback
 * @argument {boolean} initial - Indicating if this is the first request ran.
 */
/**
 * A function determining, if the next page should be fetched
 * @callback fetchNextPage
 * @argument {external:sdk/request.Response} data
 * @argument {number} pageSize - The expected size of a page.
 * @return {boolean}
 */
/**
 * @callback completeCallback
 * @argument {Array} data - All the fetched items
 */
/**
 * Extracts the items from a page out of an Add-on SDK Response object
 * @callback getItems
 * @argument {external:sdk/request.Response} data
 * @return {Array} The extracted items.
 */
/**
 * @callback getPageNumber
 * @argument {number|string} page - The current page.
 * @argument {number} pageSize - The size of a page.
 * @argument {external:sdk/request.Response} data
 * @return {number|string} The next page to fetch.
 */
/**
 * @typedef {Object} PaginationHelperOptions
 * @property {string} url - The base URL to call.
 * @property {number} [pageSize=100] - The number of expected items per full page.
 * @property {request} request
 * @property {fetchNextPage} fetchNextPage
 * @property {completeCallback} [onComplete]
 * @property {getItems} getItems
 * @property {getPageNumber} [getPageNumber] - Defaults to a function returning
 *                                             the current page number + pageSize.
 * @property {number|string} [initialPage=0] - The first page that is fetched.
 */
/**
 * A helper object for working with paginated APIs. It fetches all the content
 * and then returns an array of all data. Runs immediately after construction.
 * @constructor
 * @argument {PaginationHelperOptions} options
 */
function PaginationHelper(options) {
    this.url           = options.url;
    this.request       = options.request;
    this.fetchNextPage = options.fetchNextPage;
    this.onComplete    = options.onComplete;
    this.getItems      = options.getItems;

    if("pageSize" in options)
        this.pageSize = options.pageSize;
    if("getPageNumber" in options)
        this.getPageNumber = options.getPageNumber;

    if("initialPage" in options) {
        this.page = options.initialPage;
    }
    this.result = [];

    this.getPage(true);
}

PaginationHelper.prototype.getPage = function(initial) {
    this.request(this.url+this.page, (data) => {
        this.result = this.result.concat(this.getItems(data));
        if(this.fetchNextPage(data, this.pageSize)) {
            this.page = this.getPageNumber(this.page, this.pageSize, data);
            this.getPage(false);
        }
        else {
            if(this.onComplete)
                this.onComplete(this.result);
        }
    }, initial);
};

exports.PaginationHelper = PaginationHelper;

/**
 * Get a PaginationHelper that resolves a promise. The specified callback
 * functions are not handeld promise aware.
 * @argument {PaginationHelperOptions} options
 * @return {Promise} A promise that resolves when the PaginationHelper is done.
 */
let promisedPaginationHelper = (options) => {
    let { promise, resolve } = defer();

    options.onComplete = resolve;

    let pgH = new PaginationHelper(options);

    return promise;
};

exports.promisedPaginationHelper = promisedPaginationHelper;

