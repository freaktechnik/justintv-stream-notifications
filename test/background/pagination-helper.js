/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from "ava";
import sinon from "sinon";
import {
    PaginationHelper, promisedPaginationHelper
} from "../../src/background/pagination-helper";

test.cb("PaginationHelper with callbacks", (t) => {
    const URL = "http://example.com/?offset=",
        cbk = sinon.spy((url, callback, initial) => {
            t.is(url, URL + (cbk.callCount - 1));
            if(initial) {
                callback(cbk.callCount);
            }
            else {
                return Promise.resolve(cbk.callCount);
            }
        });
    new PaginationHelper({
        url: URL,
        pageSize: 1,
        request: cbk,
        fetchNextPage(data) {
            t.is(data, cbk.callCount, "fetchNextPage got the correct data");
            return data < 2;
        },
        onComplete(data) {
            t.true(Array.isArray(data), "data is an array");
            t.is(data[0], 1, "First data element is has the correct value");
            t.is(data[data.length - 1], cbk.callCount, "Last data element has the correct value");
            t.is(data.length, cbk.callCount, "data has the correct length");
            t.end();
        },
        getItems(data) {
            t.is(data, cbk.callCount, "getItems got the correct data");
            return data;
        }
    });
});


test.cb("PaginationHelper Page Number Generator", (t) => {
    const URL = "http://example.com/?offset=",
        hash = "asdf",
        cbk = sinon.spy((page, pageSize, data) => {
            t.is(page, "", "Initial page value was passed in correctly");
            t.is(pageSize, 1, "Page size was passed in correctly");
            t.is(data, cbk.callCount - 1, "Correct data was passed to getPageNumber");
            return hash;
        });
    new PaginationHelper({
        url: URL,
        pageSize: 1,
        initialPage: "",
        request(url, callback) {
            if(cbk.callCount === 0) {
                t.is(url, URL, "Initial ,URL is correct");
            }
            else {
                t.is(url, URL + hash, "URL has hash the second time");
            }
            callback(cbk.callCount);
        },
        getPageNumber: cbk,
        fetchNextPage(data) {
            t.is(data, cbk.callCount, "Next page called and data inptu is correct");
            return data < 1;
        },
        onComplete(data) {
            t.true(Array.isArray(data), "Data is an array");
            t.is(data[0], 0, "data's first item is correct");
            t.is(data[data.length - 1], cbk.callCount, "data's last item is correct");
            t.is(data.length, 2, "Data has the correct amount of items");
            t.end();
        },
        getItems(data) {
            t.is(data, cbk.callCount, "getItems got the correct data");
            return data;
        }
    });
});

test("Promised PaginationHelper", async (t) => {
    const URL = "http://example.com/?offset=",
        cbk = sinon.spy((url, callback) => {
            t.is(url, URL + (cbk.callCount - 1), "request got the correct URL");
            callback(cbk.callCount);
        }),
        data = await promisedPaginationHelper({
            url: URL,
            pageSize: 1,
            request: cbk,
            fetchNextPage(data) {
                t.is(data, cbk.callCount, "fetchNextPage got the correct data");
                return data < 1;
            },
            getItems(data) {
                t.is(data, cbk.callCount, "getItems got the correct data");
                return data;
            }
        });

    t.true(Array.isArray(data), "data is an array");
    t.is(data[0], 1, "First data element is has the correct value");
    t.is(data[data.length - 1], cbk.callCount, "Last data element has the correct value");
    t.is(data.length, cbk.callCount, "data has the correct length");
});
