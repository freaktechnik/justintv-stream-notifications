/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import RequestQueue from '../../../src/background/queue';

//TODO mock clock with sinon to actually test auto fetching

test('adding new request to queue', (t) => {
    const q = new RequestQueue(),
        i = q.addRequest({});
    t.is(i, q.queue[0].id);
    t.is(typeof (q.queue[0]), 'object');

    q.clear();
});

test('get request index', (t) => {
    const q = new RequestQueue(),
        i = q.addRequest({});
    t.is(q.getRequestIndex(i), 0);
    t.is(q.getRequestIndex(-1), -1);

    q.clear();
});

test('request queued', (t) => {
    const q = new RequestQueue(),
        i = q.addRequest({});
    t.true(q.requestQueued(i));
    t.false(q.requestQueued(i + 7));

    q.clear();
});

test('removing requests', (t) => {
    const q = new RequestQueue(),
        i = q.addRequest({});
    t.true(q.removeRequest(i), "Request removed");
    t.true(!q.requestQueued(i));

    q.clear();
});

test('removing nonexisting request', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    t.true(!q.removeRequest("http://localhost"), "no request to remove");
    q.clear();
});

test('autofetch', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000, 0.5, 10);
    t.truthy(q._intervalID);
    q.clear();
});

test('working on queue', (t) => {
    const q = new RequestQueue();
    t.true(!q.workingOnQueue());
    q.addRequest({});
    t.false(q.workingOnQueue());
    q.autoFetch(1000000, 0.5, 10);
    t.true(q.workingOnQueue());
    q.clear();
});

test('not working on queue', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(0, 0.5, 10);
    t.false(q.workingOnQueue());
    q.clear();
});

test('changing interval when not working on q', (t) => {
    const q = new RequestQueue();
    t.false(q.workingOnQueue());
    q.autoFetch(100000, 0.5, 10);
    t.true(q.workingOnQueue());
    q.clear();
});

test('interval changing', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000, 0.5, 10);
    const oldId = q._intervalID;
    q.autoFetch(1000, 0.5, 10);
    t.not(q._intervalID, oldId);
    q.clear();
});

test('queue clearing', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(100000, 0.1, 500);
    q.clear();
    t.is(q.queue.length, 0);
    t.false(q.workingOnQueue());
});

test('queue clearing 2', (t) => {
    const q = new RequestQueue();
    q.autoFetch(10000000, 0.1, 500);
    q.clear();
    t.false(q.workingOnQueue());
});

test.cb('get request', (t) => {
    const q = new RequestQueue();
    q.addRequest({
        url: "http://localhost",
        onComplete: t.end
    });
    t.is(q.queue.length, 1);
    q.getRequest(0);
    t.is(q.queue.length, 0);
});

test('get request batch without args', (t) => {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    t.is(q.queue.length, 3);
    q.getRequestBatch();
    t.is(q.queue.length, 0);

    q.clear();
});

test('get request batch bigger than queue', (t) => {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    t.is(q.queue.length, 3);
    q.getRequestBatch(4);
    t.is(q.queue.length, 0);

    q.clear();
});

test('get request batch', (t) => {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    t.is(q.queue.length, 3);
    q.getRequestBatch(2);
    t.is(q.queue.length, 1);
    q.clear();
});

test('get request by url', (t) => {
    const q = new RequestQueue();
    const i = q.addRequest({ url: "http://localhost" });

    t.is(q.getRequestIndex("http://localhost"), i);
    q.clear();
});

test('getting a request with an unknown arg', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    t.is(q.getRequestIndex([]), -1);
    q.clear();
});
