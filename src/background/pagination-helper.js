/**
 * Pagination helper for APIs with pagination.
 *
 * @module pagination-helper
 * @author Martin Giger
 * @license MPL-2.0
 */

/**
 * An SDK request for executing HTTP request.
 *
 * @external sdk/request
 * @requires sdk/request
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request}
 */
/**
 * Add-on SDK Response object.
 *
 * @class Response
 * @memberof external:sdk/request
 * @inner
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Response}
 */

/**
 * A helper object for working with paginated APIs. It fetches all the content
 * and then returns an array of all data. Runs immediately after construction.
 *
 * @class
 * @param {module:pagination-helper~PaginationHelperOptions} options - Pagination
 *        helper configuration.
 * @alias module:pagination-helper.PaginationHelper
 */
function PaginationHelper(options) {
    this.url = options.url;
    this.request = options.request;
    this.fetchNextPage = options.fetchNextPage;
    this.onComplete = options.onComplete;
    this.getItems = options.getItems;

    if("pageSize" in options) {
        this.pageSize = options.pageSize;
    }
    if("getPageNumber" in options) {
        this.getPageNumber = options.getPageNumber;
    }

    if("initialPage" in options) {
        this.page = options.initialPage;
    }
    this.result = [];

    this.getPage(true);
}

PaginationHelper.prototype.url = "localhost/";
PaginationHelper.prototype.page = 0;
PaginationHelper.prototype.pageSize = 100;
PaginationHelper.prototype.result = [];
PaginationHelper.prototype.request = null;
PaginationHelper.prototype.fetchNextPage = null;
PaginationHelper.prototype.onComplete = null;
PaginationHelper.prototype.getItems = null;
PaginationHelper.prototype.getPageNumber = function(page, pageSize) {
    return page + pageSize;
};

/**
 * A function running a request on the provided URL and then calling the
 * callback function. Alternatively returnes a promise. Normally is
 * {@link module:queueservice~QueueServie.queueRequest}, which returns a
 * {@link external:sdk/request~Response}.
 *
 * @callback request
 * @param {string} url
 * @param {Function} callback
 * @param {boolean} initial - Indicating if this is the first request ran.
 * @returns {?Promise} Optionally returns a promise instead of calling the
 *         callback function.
 */
/**
 * A function determining, if the next page should be fetched.
 *
 * @callback fetchNextPage
 * @param {?} data - Whatever {@link module:pagination-helper~request} returned.
 * @param {number} pageSize - The expected size of a page.
 * @returns {boolean}
 */
/**
 * @callback completeCallback
 * @param {Array} data - All the fetched items.
 */
/**
 * Extracts the items from a page out of an Add-on SDK Response object.
 *
 * @callback getItems
 * @param {?} data - Whatever {@link module:pagination-helper~request} returned.
 * @returns {Array} The extracted items.
 */
/**
 * @callback getPageNumber
 * @param {number|string} page - The current page.
 * @param {number} pageSize - The size of a page.
 * @param {?} data - Whatever {@link module:pagination-helper~request} returned.
 * @returns {number|string} The next page to fetch.
 */
/**
 * @typedef {object} PaginationHelperOptions
 * @property {string} url - The base URL to call.
 * @property {number} [pageSize=100] - The number of expected items per full page.
 * @property {module:pagination-helper~request} request
 * @property {module:pagination-helper~fetchNextPage} fetchNextPage
 * @property {module:pagination-helper~completeCallback} [onComplete]
 * @property {module:pagination-helper~getItems} getItems
 * @property {module:pagination-helper~getPageNumber} [getPageNumber=(page, pageSize) => page + pageSize]
 * @property {number|string} [initialPage=0] - The first page that is fetched.
 */

/**
 * Fetches the next page and then processes the content. Invokes itself
 * recursively and is initially invoked from the constructor. If all content
 * was fetched onComplete is called.
 *
 * @param {boolean} [initial=false] - If this is the first fetched page.
 * @returns {undefined}
 */
PaginationHelper.prototype.getPage = function(initial = false) {
    const cbk = (data) => {
            this.result = this.result.concat(this.getItems(data));
            if(this.fetchNextPage(data, this.pageSize)) {
                this.page = this.getPageNumber(this.page, this.pageSize, data);
                this.getPage();
            }
            else {
                if(this.onComplete) {
                    this.onComplete(this.result.slice());
                }
                this.result.length = 0;
            }
        },
        ret = this.request(this.url + this.page, cbk, initial);

    if(typeof (ret) == "object" && "then" in ret) {
        ret.then(cbk).catch(console.error);
    }
};

/**
 * Get a PaginationHelper that resolves a promise. The specified callback
 * functions are not handeld promise aware.
 *
 * @param {module:pagination-helper~PaginationHelperOptions} options - Pagination
 *        helper configuration without onComplete.
 * @async
 * @returns {undefined} The PaginationHelper is done.
 * @alias module:pagination-helper.promisedPaginationHelper
 */
const promisedPaginationHelper = (options) => new Promise((resolve) => {
    options.onComplete = resolve;

    new PaginationHelper(options);
});

export {
    promisedPaginationHelper, PaginationHelper
};
