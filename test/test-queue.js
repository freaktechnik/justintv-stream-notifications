/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

const requireHelper = require("./require_helper");
const RequestQueue = requireHelper('../lib/queue').default;
const { when } = require("sdk/event/utils");

exports['test adding new request to queue'] = function(assert) {
    const q = new RequestQueue();
    const i = q.addRequest({});
    assert.equal(i,q.queue[0].id);
    assert.equal(typeof(q.queue[0]),'object');

    q.clear();
};

exports['test get request index'] = function(assert) {
    const q = new RequestQueue();
    const i = q.addRequest({});
    assert.equal(q.getRequestIndex(i),0);
    assert.equal(q.getRequestIndex(-1),-1);

    q.clear();
};

exports['test request queued'] = function(assert) {
    const q = new RequestQueue();
    const i = q.addRequest({});
    assert.ok(q.requestQueued(i));
    assert.ok(!q.requestQueued(i + 7));

    q.clear();
};

exports['test removing requests'] = function(assert) {
    const q = new RequestQueue();
    const i = q.addRequest({});
    assert.ok(q.removeRequest(i), "Request removed");
    assert.ok(!q.requestQueued(i));

    q.clear();
};

exports['test removing nonexisting request'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({});
    assert.ok(!q.removeRequest("http://localhost"), "no request to remove");
    q.clear();
};

exports['test autofetch'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    assert.ok(!!q._intervalID);
    q.clear();
};

exports['test working on queue'] = function(assert) {
    const q = new RequestQueue();
    assert.ok(!q.workingOnQueue());
    q.addRequest({});
    assert.ok(!q.workingOnQueue());
    q.autoFetch(1000000,0.5,10);
    assert.ok(q.workingOnQueue());
    q.clear();
};

exports['test not working on queue'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(0, 0.5, 10);
    assert.ok(!q.workingOnQueue());
    q.clear();
};

exports['test changing interval when not working on q'] = function(assert) {
    const q = new RequestQueue();
    assert.ok(!q.workingOnQueue());
    q.autoFetch(100000, 0.5, 10);
    assert.ok(q.workingOnQueue());
    q.clear();
};

exports['test interval changing'] = function(assert ) {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    const oldId = q._intervalID;
    q.autoFetch(1000,0.5,10);
    assert.notEqual(q._intervalID,oldId);
    q.clear();
};

exports['test queue clearing'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(100000,0.1,500);
    q.clear();
    assert.equal(q.queue.length,0);
    assert.ok(!q.workingOnQueue());
};

exports['test queue clearing 2'] = function(assert) {
    const q = new RequestQueue();
    q.autoFetch(10000000, 0.1, 500);
    q.clear();
    assert.ok(!q.workingOnQueue());
};

exports['test get request'] = function(assert, done) {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost", onComplete: done });
    assert.equal(q.queue.length, 1);
    q.getRequest(0);
    assert.equal(q.queue.length, 0);
};

exports['test get request batch without args'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    assert.equal(q.queue.length, 3);
    q.getRequestBatch();
    assert.equal(q.queue.length, 0);

    q.clear();
};

exports['test get request batch bigger than queue'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    assert.equal(q.queue.length, 3);
    q.getRequestBatch(4);
    assert.equal(q.queue.length, 0);

    q.clear();
};

exports['test get request batch'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    q.addRequest({ url: "http://localhost" });
    assert.equal(q.queue.length, 3);
    q.getRequestBatch(2);
    assert.equal(q.queue.length, 1);
    q.clear();
};

exports['test get request by url'] = function(assert) {
    const q = new RequestQueue();
    const i = q.addRequest({ url: "http://localhost" });

    assert.equal(q.getRequestIndex("http://localhost"), i);
    q.clear();
};

exports['test getting a request with an unknown arg'] = function(assert) {
    const q = new RequestQueue();
    q.addRequest({});
    assert.equal(q.getRequestIndex([]), -1);
    q.clear();
};

require("sdk/test").run(exports);

