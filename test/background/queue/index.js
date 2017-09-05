/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import RequestQueue from '../../../src/background/queue';

const req = {
    url: "http://localhost",
    onComplete() {
        // empty
    }
};

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
    t.false(q.requestQueued(i));

    q.clear();
});

test('removing nonexisting request', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    t.false(q.removeRequest("http://localhost"), "no request to remove");
    q.clear();
});

test('queue clearing', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    q.clear();
    t.is(q.queue.length, 0);
    t.false(q.workingOnQueue);
});

test('queue clearing 2', (t) => {
    const q = new RequestQueue();
    q.clear();
    t.false(q.workingOnQueue);
});

test('get request by url', (t) => {
    const q = new RequestQueue();
    const i = q.addRequest(req);

    t.is(q.getRequestIndex("http://localhost"), i);
    q.clear();
});

test('getting a request with an unknown arg', (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    t.is(q.getRequestIndex([]), -1);
    q.clear();
});

test.todo("test the promise worker stuff");
