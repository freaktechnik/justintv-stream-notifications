/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import RequestQueue from '../../../src/background/queue';
import { promiseSpy } from '../../helpers/promise-spy';

const QUEUE_ALARM_NAME = "main-queue";
/* TODO: Integration test of autofetch
const spinQueue = () => {
    browser.alarms.onAlarm.dispatch({
        name: QUEUE_ALARM_NAME
    });
};*/

const req = {
    url: "http://localhost",
    onComplete() {
        // empty
    }
};

test.serial.beforeEach(() => {
    browser.alarms.create.reset();
});

browser.alarms.clear.resolves();

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

test.serial('autofetch', async (t) => {
    const q = new RequestQueue();
    q.addRequest(req);
    await q.autoFetch(1000000, 0.5, 10);
    t.is(browser.alarms.create.callCount, 1);
    t.is(browser.alarms.create.firstCall.args[0], QUEUE_ALARM_NAME);
    q.clear();
});

test('working on queue', (t) => {
    const q = new RequestQueue();
    t.false(q.workingOnQueue());
    q.addRequest({});
    t.false(q.workingOnQueue());
    q.autoFetch(1000000, 0.5, 10);
    t.true(q.workingOnQueue());
    q.clear();
});

test('not working on queue', async (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    await q.autoFetch(0, 0.5, 10);
    t.false(q.workingOnQueue());
    q.clear();
});

test('changing interval when not working on q', async (t) => {
    const q = new RequestQueue();
    t.false(q.workingOnQueue());
    await q.autoFetch(100000, 0.5, 10);
    t.true(q.workingOnQueue());
    q.clear();
});

test.serial('interval changing', async (t) => {
    const q = new RequestQueue();
    q.addRequest(req);
    await q.autoFetch(1000000, 0.5, 10);
    t.is(Math.round(browser.alarms.create.firstCall.args[1].periodInMinutes * 60000), 1000000);
    await q.autoFetch(1000, 0.5, 10);
    t.is(Math.round(browser.alarms.create.secondCall.args[1].periodInMinutes * 60000), 1000);
    q.clear();
});

test('queue clearing', async (t) => {
    const q = new RequestQueue();
    q.addRequest({});
    await q.autoFetch(100000, 0.1, 500);
    q.clear();
    t.is(q.queue.length, 0);
    t.false(q.workingOnQueue());
});

test('queue clearing 2', async (t) => {
    const q = new RequestQueue();
    await q.autoFetch(10000000, 0.1, 500);
    q.clear();
    t.false(q.workingOnQueue());
});

test('get request', async (t) => {
    const q = new RequestQueue();
    const cbk = promiseSpy();
    q.addRequest({
        url: "http://localhost",
        onComplete: cbk
    });
    t.is(q.queue.length, 1);
    q.getRequest(0);
    await cbk.promise;
    t.is(q.queue.length, 0);
    t.true(cbk.calledOnce);
});

test('get request batch without args', (t) => {
    const q = new RequestQueue();
    q.addRequest(req);
    q.addRequest(req);
    q.addRequest(req);
    t.is(q.queue.length, 3);
    q.getRequestBatch();
    t.is(q.queue.length, 0);

    q.clear();
});

test('get request batch bigger than queue', (t) => {
    const q = new RequestQueue();
    q.addRequest(req);
    q.addRequest(req);
    q.addRequest(req);
    t.is(q.queue.length, 3);
    q.getRequestBatch(4);
    t.is(q.queue.length, 0);

    q.clear();
});

test('get request batch', (t) => {
    const q = new RequestQueue();
    q.addRequest(req);
    q.addRequest(req);
    q.addRequest(req);
    t.is(q.queue.length, 3);
    q.getRequestBatch(2);
    t.is(q.queue.length, 1);
    q.clear();
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
