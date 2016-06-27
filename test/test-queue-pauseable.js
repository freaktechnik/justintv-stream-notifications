/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const PauseableQueue = requireHelper("../lib/queue/pauseable").default;
const RequestQueue = requireHelper("../lib/queue").default;
const { when } = require("sdk/event/utils");
const { NetUtil: { ioService }} = require("resource://gre/modules/NetUtil.jsm");

exports['test construction'] = function(assert) {
    const q = new PauseableQueue();
    assert.ok(q instanceof RequestQueue);

    q.clear();
};

exports['test pauseable queue paused porperty'] = function(assert) {
    const q = new PauseableQueue();
    assert.ok(q.paused);

    q.autoFetch(25, 0.5, 2);

    assert.ok(!q.paused);

    q.pause();
    assert.ok(q.paused);

    q.resume();
    assert.ok(!q.paused);

    q.clear();
};

exports['test pauseable queue events'] = function*(assert) {
    const q = new PauseableQueue();
    q.autoFetch(25, 0.5, 2);
    let p = when(q, "pause");
    q.pause();
    yield p;

    p = when(q, "resume");
    q.resume();
    yield p;

    q.clear();
};

exports['test network observers'] = function*(assert) {
    const q = new PauseableQueue();
    q.autoFetch(25, 0.5, 2);

    let p = when(q, "pause");
    ioService.offline = true;
    yield p;

    p = when(q, "resume");
    ioService.offline = false;
    yield p;

    q.clear();
};

exports['test autoFetch in offline mode'] = function*(assert) {
    const previousMode = ioService.offline;
    const q = new PauseableQueue();
    q.autoFetch(25, 0.5, 2);

    let p = when(q, "pause");
    ioService.offline = true;
    yield p;

    assert.strictEqual(q.interval, 0);

    q.autoFetch(25, 0.5, 2);
    assert.strictEqual(q.interval, 0);

    q.clear();
    ioService.offline = previousMode;
};

require("sdk/test").run(exports);
