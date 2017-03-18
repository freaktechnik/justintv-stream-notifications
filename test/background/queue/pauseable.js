/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import PauseableQueue from "../../../src/background/queue/pauseable";
import RequestQueue from "../../../src/background/queue";
import { when } from "../../../src/utils";

browser.alarms.clear.returns(Promise.resolve());

test('construction', (t) => {
    const q = new PauseableQueue();
    t.true(q instanceof RequestQueue);

    q.clear();
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

    q.clear();
});

test('pauseable queue events', async () => {
    const q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);
    let p = when(q, "pause");
    q.pause();
    await p;

    p = when(q, "resume");
    q.resume();
    await p;

    q.clear();
});

test.serial('network observers', async () => {
    const q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);

    let p = when(q, "pause");
    navigator.onLine = false;
    await p;

    p = when(q, "resume");
    navigator.onLine = true;
    await p;

    q.clear();
});

test.serial('autoFetch in offline mode', async (t) => {
    const previousMode = navigator.onLine,
        q = new PauseableQueue();
    await q.autoFetch(25, 0.5, 2);

    const p = when(navigator, "offline");
    navigator.onLine = false;
    await p;

    t.is(q.interval, 0);

    await q.autoFetch(25, 0.5, 2);
    t.is(q.interval, 0);

    q.clear();
    navigator.onLine = previousMode;
});
