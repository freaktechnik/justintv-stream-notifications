/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
const { PaginationHelper } = require("../lib/pagination-helper");

exports.testPaginationHelper = function(assert, done) {
    const URL = "http://example.com/?offset=";
    var count = 0,
        ph = new PaginationHelper({
            url: URL,
            pageSize: 1,
            request: function(url, callback) {
                assert.equal(url, URL+count++, "request got the correct URL");
                callback(count);
            },
            fetchNextPage: function(data) {
                assert.equal(data, count, "fetchNextPage got the correct data");
                return data < 1;
            },
            onComplete: function(data) {
                assert.ok(Array.isArray(data), "data is an array");
                assert.equal(data[0], 1, "First data element is has the correct value");
                assert.equal(data[data.length-1], count, "Last data element has the correct value");
                assert.equal(data.length, count, "data has the correct length");
                done();
            },
            getItems: function(data) {
                assert.equal(data, count, "getItems got the correct data");
                return data;
            }
        });
};


exports.testPaginationHelperPageNumberGenerator = function(assert, done) {
    const URL = "http://example.com/?offset=";    
    var hash = "asdf", count = 0,
        ph = new PaginationHelper({
            url: URL,
            pageSize: 1,
            initialPage: "",
            request: function(url, callback) {
                if(count == 0)
                    assert.equal(url, URL, "Initial URL is correct");
                else
                    assert.equal(url, URL+hash, "URL has hash the second time");
                callback(count);
            },
            getPageNumber(page, pageSize, data) {
                assert.equal(page, "", "Initial page value was passed in correctly");
                assert.equal(pageSize, 1, "Page size was passed in correctly");
                assert.equal(data, count, "Correct data was passed to getPageNumber");
                count++;
                return hash;
            },
            fetchNextPage: function(data) {
                assert.equal(data, count, "Next page called and data inptu is correct");
                return data < 1;
            },
            onComplete: function(data) {
                assert.ok(Array.isArray(data), "Data is an array");
                assert.equal(data[0], 0, "data's first item is correct");
                assert.equal(data[data.length-1], count, "data's last item is correct");
                assert.equal(data.length, 2, "Data has the correct amount of items");
                done();
            },
            getItems: function(data) {
                assert.equal(data, count, "getItems got the correct data");
                return data;
            }
        });
};

require("sdk/test").run(exports);

