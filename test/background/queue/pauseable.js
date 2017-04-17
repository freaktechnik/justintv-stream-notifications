/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import PauseableQueue from "../../../src/background/queue/pauseable";
import RequestQueue from "../../../src/background/queue";
import { when } from "../../../src/utils";

browser.alarms.clear.resolves();

test('construction', (t) => {
    const q = new PauseableQueue();
    t.true(q instanceof RequestQueue);

    q._cleanup();
});

test('pauseable queue paused porperty', async (t) => {
    const q = new PauseableQueue();
    t.true(q.paused);

    await q.autoFetch(25, 0.5, 2);

    t.false(q.paused);

    q.pause();
    t.true(q.paused);

    q.resume();
    t.false(q.paused);

    q._cleanup();
});

test('pauseable queue events', async (t) => {
    const q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);
    let p = when(q, "pause");
    q.pause();
    await p;
    t.true(q.paused);

    p = when(q, "resume");
    q.resume();
    await p;
    t.false(q.paused);

    q._cleanup();
});

test.serial('network observers', async (t) => {
    const q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);

    t.false(q.paused);

    let p = when(q, "pause");
    navigator.onLine = false;
    await p;
    t.true(q.paused);

    p = when(q, "resume");
    navigator.onLine = true;
    await p;
    t.false(q.paused);

    q._cleanup();
});

test.serial('autoFetch in offline mode', async (t) => {
    const previousMode = navigator.onLine,
        q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);

    const p = when(window, "offline");
    navigator.onLine = false;
    await p;

    t.is(q.interval, 0);

    await q.autoFetch(25, 0.5, 2);
    t.is(q.interval, 0);

    q._cleanup();
    navigator.onLine = previousMode;
});
