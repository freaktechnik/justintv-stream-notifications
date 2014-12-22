/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { RequestQueue, UpdateQueue } = require('../lib/queue');

exports['test adding new request to queue'] = function(assert) {
    var q = new RequestQueue();
    var i = q.addRequest({})
    assert.equal(i,1);
    assert.equal(i,q.queue[0].id);
    assert.equal(typeof(q.queue[0]),'object');
};

exports['test get request index'] = function(assert) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    assert.equal(q.getRequestIndex(i),0);
    assert.equal(q.getRequestIndex(0),-1);
};

exports['test request queued'] = function(assert) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    assert.ok(q.requestQueued(i));
    assert.ok(!q.requestQueued(0));
};

exports['test removing requests'] = function(assert) {
    var q = new RequestQueue();
    var i = q.addRequest({});
    q.removeRequest(i);
    assert.ok(!q.requestQueued(i));
};

exports['test autofetch'] = function(assert) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    assert.ok(!!q._intervalID);
    q.clear();
};

exports['test working on queue'] = function(assert) {
    var q = new RequestQueue();
    assert.ok(!q.workingOnQueue());
    q.addRequest({});
    assert.ok(!q.workingOnQueue());
    q.autoFetch(1000000,0.5,10);
    assert.ok(q.workingOnQueue());
    q.clear();
};

exports['test interval changing'] = function(assert ) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(1000000,0.5,10);
    var oldId = q._intervalID;
    q.changeInterval(1000,0.5,10);
    assert.notEqual(q._intervalID,oldId);
    q.clear();
};

exports['test queue clearing'] = function(assert) {
    var q = new RequestQueue();
    q.addRequest({});
    q.autoFetch(100000,0.1,500);
    q.clear();
    assert.equal(q.queue.length,0);
    assert.ok(!q.workingOnQueue());
};

exports['test adding new request to queue'] = function(assert) {
    var q = new UpdateQueue();
    var i = q.addRequest({})
    assert.equal(i,1);
    assert.equal(i,q.queue[0].id);
    assert.equal(typeof(q.queue[0]),'object');
};

require("sdk/test").run(exports);

