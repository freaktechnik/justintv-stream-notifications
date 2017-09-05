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

test('pauseable queue paused porperty', (t) => {
    const q = new PauseableQueue();

    q.pause();
    t.true(q.paused);

    q.resume();
    t.false(q.paused);

    q._cleanup();
});

test('pauseable queue events', async (t) => {
    const q = new PauseableQueue();
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
