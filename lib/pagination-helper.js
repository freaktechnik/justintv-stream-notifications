/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Pagination helper for APIs with pagination
 */

"use strict";

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

function PaginationHelper(options) {
    this.url           = options.url;
    this.pageSize      = options.pageSize;
    this.request       = options.request;
    this.fetchNextPage = options.fetchNextPage;
    this.onComplete    = options.onComplete;
    this.getItems      = options.getItems;
    if("getPageNumber" in options)
        this.getPageNumber = options.getPageNumber;

    if("initialPage" in options) {
        this.page = options.initialPage;
    }
    this.result = [];

    this.getPage(true);
}

PaginationHelper.prototype.getPage = function(initial) {
    this.request(this.url+this.page, (function(data) {
        this.result = this.result.concat(this.getItems(data));
        if(this.fetchNextPage(data, this.pageSize)) {
            this.page = this.getPageNumber(this.page, this.pageSize, data);
            this.getPage(false);
        }
        else {
            if(this.onComplete)
                this.onComplete(this.result);
        }
    }).bind(this), initial);
};

exports.PaginationHelper = PaginationHelper;

