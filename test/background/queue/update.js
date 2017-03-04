/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import UpdateQueue from '../../../src/background/queue/update';
import PauseableQueue from '../../../src/background/queue/pauseable';
import { when } from "../../../src/utils";
import sinon from 'sinon';

let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});
test.after(() => {
    clock.restore();
});

test('construction', (t) => {
    const q = new UpdateQueue();
    t.true(q instanceof PauseableQueue);

    q.clear();
});

test.serial("Interval Pause/Resume", (t) => {
    const queue = new UpdateQueue();
    const cbk = sinon.spy();

    queue.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true);
    queue.autoFetch(700, 1, 1);

    clock.tick(700);

    t.true(cbk.calledOnce);
    queue.pause();

    clock.tick(500);

    queue.resume();

    clock.tick(700);

    t.true(cbk.calledTwice);

    queue.clear();
});

test('adding new request to queue', (t) => {
    const q = new UpdateQueue(),
        i = q.addRequest({});
    t.is(i, q.queue[0].id);
    t.is(typeof (q.queue[0]), 'object');
    t.false(q.queue[0].priorize);
    t.false(q.queue[0].persist);
    t.is(q.queue[0].skip, 0);

    q.clear();
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

    q.clear();
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

    q.clear();
});

test('contains priorized', (t) => {
    const q = new UpdateQueue();

    t.false(q.containsPriorized());

    q.addRequest({}, false, true);

    t.true(q.containsPriorized());

    q.clear();
});

test('get just a request', (t) => {
    const q = new UpdateQueue();

    q.addRequest({
        url: "https://localhost"
    });
    t.is(q.queue.length, 1);

    q.getRequest(0);
    t.is(q.queue.length, 0);

    q.clear();
});

test('get multiple priorized requests', async (t) => {
    const q = new UpdateQueue();

    q.addRequest({
        url: "https://localhost"
    }, false, true);
    q.addRequest({
        url: "https://localhost"
    }, false, true);
    t.is(q.queue.length, 2);

    q.getRequest(0);
    t.is(q.queue.length, 1);

    const p = when(q, "allpriorizedloaded");
    q.getRequest(0);
    await p;
    t.is(q.queue.length, 0);

    q.clear();
});

test.cb('persistent request by index', (t) => {
    let counter = 0;
    const q = new UpdateQueue();
    q.addRequest({
        url: "https://localhost",
        onComplete: () => {
            t.is(counter, 1);
            t.is(q.queue[0].skipped, 0);
            q.clear();
            t.end();
        }
    }, true, false, 1);

    q.getRequestByIndex(0);
    ++counter;

    t.is(q.queue[0].skipped, 1);

    q.getRequestByIndex(0);
});

test('persistent priorized request by index', async (t) => {
    let resolvePromise,
        p = new Promise((resolve) => {
            resolvePromise = resolve;
        });
    const q = new UpdateQueue();
    q.addRequest({
        url: "https://localhost",
        onComplete: () => resolvePromise
    }, true, true, 1);

    q.getRequestByIndex(0);
    await p.promise;
    t.is(q.queue[0].skipped, 0, "Skips got reset after priorized fetch");
    t.false(q.queue[0].priorize, "Request was unpriorized after first fetch");

    p = new Promise((resolve) => {
        resolvePromise = resolve;
    });

    q.getRequestByIndex(0);
    t.is(q.queue[0].skipped, 1, "Request skipped the second time");

    q.getRequestByIndex(0);
    await p;
    t.is(q.queue[0].skipped, 0, "Skip was reset after unpriorized fetch");

    q.clear();
});

test('get all priorized', async (t) => {
    const q = new UpdateQueue();

    q.addRequest({
        url: "https://localhost"
    }, false, true);
    q.addRequest({
        url: "https://localhost"
    });
    q.addRequest({
        url: "https://localhost"
    }, false, true);

    t.is(q.queue.length, 3);

    const p = when(q, "allpriorizedloaded");
    q.getAllPriorized();
    await p;

    t.is(q.queue.length, 1);

    q.clear();
});

test('resume with priorized queued', async () => {
    const q = new UpdateQueue();
    q.pause();

    q.addRequest({
        url: "https://localhost"
    }, false, true);

    const p = when(q, "allpriorizedloaded");

    q.resume();
    await p;

    q.clear();
});
