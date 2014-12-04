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
PaginationHelper.prototype.pageSize = 100
PaginationHelper.prototype.result = [];
PaginationHelper.prototype.request = null;
PaginationHelper.prototype.fetchNextPage = null;
PaginationHelper.prototype.onComplete = null;
PaginationHelper.prototype.getItems = null;

function PaginationHelper(options) {
    this.url           = options.url;
    this.pageSize      = options.pageSize;
    this.request       = options.request;
    this.fetchNextPage = options.fetchNextPage;
    this.onComplete    = options.onComplete;
    this.getItems      = options.getItems;
    this.result        = new Array();

    this.getPage();
}

PaginationHelper.prototype.getPage = function() {
    this.request(this.url+(this.page++)*this.pageSize, (function(data) {
        this.result = this.result.concat(this.getItems(data));
        if(this.fetchNextPage(data)) {
            this.getPage();
        }
        else {
            if(this.onComplete)
                this.onComplete(this.result);
        }
    }).bind(this));
};

exports.PaginationHelper = PaginationHelper;

