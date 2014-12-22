/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
const { PaginationHelper } = require("../lib/pagination-helper");

exports.testPaginationHelper = function(assert, done) {
    var count = 0,
        ph = new PaginationHelper({
            url: "http://example.com/?offset=",
            pageSize: 1,
            request: function(url, callback) {
                assert.equal(url, "http://example.com/?offset="+count++);
                callback(count);
            },
            fetchNextPage: function(data) {
                assert.equal(data, count);
                return data < 1;
            },
            onComplete: function(data) {
                assert.ok(Array.isArray(data));
                assert.equal(data[0], 1);
                assert.equal(data[data.length-1], count);
                assert.equal(data.length, count);
                done();
            },
            getItems: function(data) {
                assert.equal(data, count);
                return data;
            }
        });
};

require("sdk/test").run(exports);

