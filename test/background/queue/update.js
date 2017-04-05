/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import UpdateQueue from '../../../src/background/queue/update';
import PauseableQueue from '../../../src/background/queue/pauseable';
import { when } from "../../../src/utils";
import sinon from 'sinon';
import { promiseSpy } from '../../helpers/promise-spy';

const QUEUE_ALARM_NAME = "main-queue";
const spinQueue = () => {
    browser.alarms.onAlarm.dispatch({
        name: QUEUE_ALARM_NAME
    });
};

test.serial.beforeEach(() => {
    browser.alarms.create.reset();
    browser.alarms.clear.reset();
});

test('construction', (t) => {
    const q = new UpdateQueue();
    t.true(q instanceof PauseableQueue);

    q._cleanup();
});

test.serial("Interval Pause/Resume", async (t) => {
    const queue = new UpdateQueue();
    const cbk = promiseSpy();

    queue.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true);
    queue.autoFetch(700, 1, 1);

    // clock.tick(700);
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledOnce);
    cbk.setupPromise();

    queue.pause();

    // clock.tick(700);

    t.true(browser.alarms.clear.calledOnce);
    t.is(browser.alarms.clear.firstCall.args[0], QUEUE_ALARM_NAME);

    queue.resume();
    t.true(browser.alarms.create.calledOnce);

    //clock.tick(700);
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledTwice);

    queue._cleanup();
});

test('adding new request to queue', (t) => {
    const q = new UpdateQueue(),
        i = q.addRequest({});
    t.is(i, q.queue[0].id);
    t.is(typeof (q.queue[0]), 'object');
    t.false(q.queue[0].priorize);
    t.false(q.queue[0].persist);
    t.is(q.queue[0].skip, 0);

    q._cleanup();
});

test('adding new priorized persisting request to queue', async (t) => {
    const q = new UpdateQueue(),
        p = when(q, "queuepriorized"),
        i = q.addRequest({}, true, true, 1);

    t.is(i, q.queue[0].id);
    t.true(q.queue[0].priorize);
    t.true(q.queue[0].persist);
    t.is(q.queue[0].skip, 1);
    await p;

    q._cleanup();
});

test('adding new priorized request to queue', async (t) => {
    const q = new UpdateQueue(),
        p = when(q, "queuepriorized"),
        i = q.addRequest({}, false, true);

    await p;
    t.is(i, q.queue[0].id);
    t.true(q.queue[0].priorize);
    t.false(q.queue[0].persist);
    t.is(q.queue[0].skip, 0);

    q._cleanup();
});

test('contains priorized', (t) => {
    const q = new UpdateQueue();

    t.false(q.containsPriorized());

    q.addRequest({}, false, true);

    t.true(q.containsPriorized());

    q._cleanup();
});

test('get just a request', async (t) => {
    const q = new UpdateQueue();
    const cbk = promiseSpy();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    });
    t.is(q.queue.length, 1);

    q.getRequest(0);
    await cbk.promise;

    t.is(q.queue.length, 0);
    t.true(cbk.calledOnce);

    q._cleanup();
});

test('get multiple priorized requests', async (t) => {
    const q = new UpdateQueue();
    const cbk = promiseSpy();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, false, true);
    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, false, true);
    t.is(q.queue.length, 2);

    q.getRequest(0);
    await cbk.promise;

    t.is(q.queue.length, 1);
    t.true(cbk.calledOnce);

    const p = when(q, "allpriorizedloaded");
    cbk.setupPromise();

    q.getRequest(0);
    await Promise.all([
        p,
        cbk.promise
    ]);
    t.is(q.queue.length, 0);
    t.true(cbk.calledTwice);

    q._cleanup();
});

test('persistent request by index', async (t) => {
    const q = new UpdateQueue();
    const cbk = promiseSpy();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true, false, 1);

    q.getRequestByIndex(0);

    t.is(q.queue[0].skipped, 1);
    t.true(cbk.notCalled);

    q.getRequestByIndex(0);
    await cbk.promise;

    t.true(cbk.calledOnce);

    q._cleanup();
});

test('persistent priorized request by index', async (t) => {
    const cbk = promiseSpy();
    const q = new UpdateQueue();
    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true, true, 1);

    q.getRequestByIndex(0);
    await cbk.promise;
    t.is(q.queue[0].skipped, 0, "Skips got reset after priorized fetch");
    t.false(q.queue[0].priorize, "Request was unpriorized after first fetch");
    t.true(cbk.calledOnce);

    cbk.setupPromise();

    q.getRequestByIndex(0);
    t.is(q.queue[0].skipped, 1, "Request skipped the second time");
    t.true(cbk.calledOnce);

    q.getRequestByIndex(0);
    await cbk.promise;
    t.is(q.queue[0].skipped, 0, "Skip was reset after unpriorized fetch");
    t.true(cbk.calledTwice);

    q._cleanup();
});

test('get all priorized', async (t) => {
    const q = new UpdateQueue();
    let resolvePromise;
    const rp = new Promise((resolve) => {
        resolvePromise = resolve;
    });
    const cbk = sinon.spy(() => {
        if(cbk.calledTwice) {
            resolvePromise();
        }
    });
    const cbk2 = sinon.spy();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, false, true);
    q.addRequest({
        url: "https://localhost",
        onComplete: cbk2
    });
    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, false, true);

    t.is(q.queue.length, 3);

    const p = when(q, "allpriorizedloaded");
    q.getAllPriorized();
    await Promise.all([
        p,
        rp
    ]);

    t.is(q.queue.length, 1);
    t.true(cbk.calledTwice);
    t.true(cbk2.notCalled);

    q._cleanup();
});

test('resume with priorized queued', async (t) => {
    const q = new UpdateQueue();
    const cbk = promiseSpy();
    q.pause();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, false, true);

    const p = when(q, "allpriorizedloaded");

    t.true(cbk.notCalled);

    q.resume();
    await Promise.all([
        p,
        cbk.promise
    ]);

    t.true(cbk.calledOnce);

    q._cleanup();
});
