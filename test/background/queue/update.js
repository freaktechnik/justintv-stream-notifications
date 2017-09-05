/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import UpdateQueue from '../../../src/background/queue/update';
import PauseableQueue from '../../../src/background/queue/pauseable';
import { promiseSpy } from '../../helpers/promise-spy';

test('construction', (t) => {
    const q = new UpdateQueue();
    t.true(q instanceof PauseableQueue);

    q._cleanup();
});

test('adding new request to queue', (t) => {
    const q = new UpdateQueue(),
        i = q.addRequest({});
    t.is(i, q.queue[0].id);
    t.is(typeof (q.queue[0]), 'object');
    t.false(q.queue[0].priorize);

    q._cleanup();
});

test('adding new priorized request to queue', (t) => {
    const q = new UpdateQueue(),
        i = q.addRequest({}, true);

    t.is(i, q.queue[0].id);
    t.true(q.queue[0].priorize);

    q._cleanup();
});

test('contains priorized', (t) => {
    const q = new UpdateQueue();

    t.false(q.containsPriorized);

    q.addRequest({}, true);

    t.true(q.containsPriorized);

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
    }, true);
    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true);
    t.is(q.queue.length, 2);

    await cbk.promise;
    t.is(q.queue.length, 0);
    t.true(cbk.calledTwice);

    q._cleanup();
});

test('resume with priorized queued', async (t) => {
    const q = new UpdateQueue();
    const cbk = promiseSpy();
    q.pause();

    q.addRequest({
        url: "https://localhost",
        onComplete: cbk
    }, true);

    t.true(cbk.notCalled);

    q.resume();
    await cbk.promise;

    t.true(cbk.calledOnce);

    q._cleanup();
});
