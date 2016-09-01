/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper"),
    UpdateQueue = requireHelper('../lib/queue/update').default,
    PauseableQueue = requireHelper('../lib/queue/pauseable').default,
    { setTimeout } = require("sdk/timers"),
    { when } = require("sdk/event/utils"),
    { defer } = require("sdk/core/promise");

exports['test construction'] = function(assert) {
    const q = new UpdateQueue();
    assert.ok(q instanceof PauseableQueue);

    q.clear();
};

exports.testIntervalPauseResume = function(assert, done) {
    const queue = new UpdateQueue();
    let count = 0,
        paused = false;

    queue.addRequest({
        url: "https://localhost",
        onComplete: () => {
            if(count === 0) {
                ++count;
                queue.pause();
                paused = true;
                setTimeout(() => {
                    paused = false;
                    queue.resume();
                }, 500);
            }
            else {
                assert.equal(count, 1);
                assert.ok(!paused);
                queue.clear();
                done();
            }
        }
    }, true);
    queue.autoFetch(700, 1, 1);
};

exports['test adding new request to queue'] = function(assert) {
    const q = new UpdateQueue(),
        i = q.addRequest({});
    assert.equal(i, q.queue[0].id);
    assert.equal(typeof (q.queue[0]), 'object');
    assert.ok(!q.queue[0].priorize);
    assert.ok(!q.queue[0].persist);
    assert.equal(q.queue[0].skip, 0);

    q.clear();
};

exports['test adding new priorized persisting request to queue'] = function* (assert) {
    const q = new UpdateQueue(),
        p = when(q, "queuepriorized"),
        i = q.addRequest({}, true, true, 1);

    assert.equal(i, q.queue[0].id);
    assert.ok(q.queue[0].priorize);
    assert.ok(q.queue[0].persist);
    assert.equal(q.queue[0].skip, 1);
    yield p;

    q.clear();
};

exports['test adding new priorized request to queue'] = function* (assert) {
    const q = new UpdateQueue(),
        p = when(q, "queuepriorized"),
        i = q.addRequest({}, false, true);

    yield p;
    assert.equal(i, q.queue[0].id);
    assert.ok(q.queue[0].priorize);
    assert.ok(!q.queue[0].persist);
    assert.equal(q.queue[0].skip, 0);

    q.clear();
};

exports['test contains priorized'] = function(assert) {
    const q = new UpdateQueue();

    assert.ok(!q.containsPriorized());

    q.addRequest({}, false, true);

    assert.ok(q.containsPriorized());

    q.clear();
};

exports['test get just a request'] = function(assert) {
    const q = new UpdateQueue();

    q.addRequest({
        url: "https://localhost"
    });
    assert.equal(q.queue.length, 1);

    q.getRequest(0);
    assert.strictEqual(q.queue.length, 0);

    q.clear();
};

exports['test get multiple priorized requests'] = function* (assert) {
    const q = new UpdateQueue();

    q.addRequest({
        url: "https://localhost"
    }, false, true);
    q.addRequest({
        url: "https://localhost"
    }, false, true);
    assert.equal(q.queue.length, 2);

    q.getRequest(0);
    assert.equal(q.queue.length, 1);

    const p = when(q, "allpriorizedloaded");
    q.getRequest(0);
    yield p;
    assert.strictEqual(q.queue.length, 0);

    q.clear();
};

exports['test persistent request by index'] = function(assert, done) {
    let counter = 0;
    const q = new UpdateQueue();
    q.addRequest({
        url: "https://localhost",
        onComplete: () => {
            assert.equal(counter, 1);
            assert.strictEqual(q.queue[0].skipped, 0);
            q.clear();
            done();
        }
    }, true, false, 1);

    q.getRequestByIndex(0);
    ++counter;

    assert.equal(q.queue[0].skipped, 1);

    q.getRequestByIndex(0);
};

exports['test persistent priorized request by index'] = function* (assert) {
    let p = defer();
    const q = new UpdateQueue();
    q.addRequest({
        url: "https://localhost",
        onComplete: () => p.resolve()
    }, true, true, 1);

    q.getRequestByIndex(0);
    yield p.promise;
    assert.strictEqual(q.queue[0].skipped, 0, "Skips got reset after priorized fetch");
    assert.ok(!q.queue[0].priorize, "Request was unpriorized after first fetch");

    p = defer();

    q.getRequestByIndex(0);
    assert.equal(q.queue[0].skipped, 1, "Request skipped the second time");

    q.getRequestByIndex(0);
    yield p;
    assert.equal(q.queue[0].skipped, 0, "Skip was reset after unpriorized fetch");

    q.clear();
};

exports['test get all priorized'] = function* (assert) {
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

    assert.equal(q.queue.length, 3);

    const p = when(q, "allpriorizedloaded");
    q.getAllPriorized();
    yield p;

    assert.equal(q.queue.length, 1);

    q.clear();
};

exports['test resume with priorized queued'] = function* () {
    const q = new UpdateQueue();
    q.pause();

    q.addRequest({
        url: "https://localhost"
    }, false, true);

    const p = when(q, "allpriorizedloaded");

    q.resume();
    yield p;

    q.clear();
};

require("sdk/test").run(exports);
