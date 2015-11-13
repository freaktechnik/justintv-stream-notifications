/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

const requireHelper = require("./require_helper");
const QueueService = requireHelper("../lib/queueservice");
const { setTimeout } = require("sdk/timers");
const { prefs } = require("sdk/simple-prefs");

exports.testGetService = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    assert.equal(service, QueueService.getServiceForProvider("test"));
    assert.notEqual(service, QueueService.getServiceForProvider("equal"));
};

exports.testIntervalPauseResume = function(assert, done) {
    let service = QueueService.getServiceForProvider("test");
    let count = 0, paused = false;
    QueueService.resume();

    service.queueUpdateRequest(["https://example.com"], service.HIGH_PRIORITY, () => {
        if(count === 0) {
            ++count;
            QueueService.pause();
            paused = true;
            setTimeout(() => {
                paused = false;
                QueueService.resume();
            }, 500);
        }
        else {
            assert.equal(count, 1);
            assert.ok(!paused);
            QueueService.updateQueueOptions(0);
            service.unqueueUpdateRequest(service.HIGH_PRIORITY);
            done();
        }
    });
    QueueService.setQueueOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });
};

// QueueService Object Tests

exports.testUpdateRequestRequeue = function(assert, done) {
    let service = QueueService.getServiceForProvider("test");
    let count = 0;

    service.queueUpdateRequest(["https://example.com"], service.HIGH_PRIORITY, () => {
        assert.equal(count, 2);
        service.unqueueUpdateRequest();
        QueueService.updateQueueOptions(0);
        done();
    }, {}, () => ++count < 2);
    QueueService.setQueueOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });
};

exports.testRequeue = function(assert, done) {
    let service = QueueService.getServiceForProvider("test");
    let count = 0;

    service.queueRequest("https://example.com", {}, () => ++count <= prefs.queueservice_maxRetries + 1)
        .then((d) => assert.fail(d))
        .catch(() => {
            assert.equal(count, prefs.queueservice_maxRetries + 1);
            QueueService.updateQueueOptions(0);
            done();
        });
    QueueService.setQueueOptions({
        interval: 70,
        amount: 1,
        maxSize: 1
    });
};

exports.testQueueService = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    assert.ok(Array.isArray(service.highPriorityRequestIds));
    assert.ok(Array.isArray(service.lowPriorityRequestIds));
    assert.equal(service.highPriorityRequestIds.length, 0);
    assert.equal(service.lowPriorityRequestIds.length, 0);
    assert.ok(service.HIGH_PRIORITY, "QueueService instance exposes HIGH_PRIORITY constant");
    assert.ok(service.LOW_PRIORITY, "QueueService isntance exposes LOW_PRIORITY constant");
};

exports.testQueueRequest = function*(assert) {
    let service = QueueService.getServiceForProvider("test");
    yield service.queueRequest("http://example.com", {}, (data) => {
        assert.pass("Requeueing function called");
        return false;
    });
};

exports.testUpdateRequest = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    service.queueUpdateRequest(["http://example.com"],
        service.HIGH_PRIORITY,
        () => { console.log("done"); },
        {},
        () => { console.log("requeue?"); return false; }
    );
    assert.equal(service.getRequestProperty(service.HIGH_PRIORITY).length, 1);
    assert.equal(service.getRequestProperty(service.HIGH_PRIORITY), service.highPriorityRequestIds);
    assert.equal(service.getRequestProperty(service.LOW_PRIORITY).length, 0);
    var id = service.highPriorityRequestIds[0];
    // Replace them
    service.queueUpdateRequest(["http://example.com", "http:/example.com"],
        service.HIGH_PRIORITY,
        () => { console.log("done"); },
        {},
        () => { console.log("requeue?"); return false; }

    );
    assert.equal(service.getRequestProperty(service.HIGH_PRIORITY).length, 2);
    assert.ok(service.getRequestProperty(service.HIGH_PRIORITY).every((i) => i != id));

    // remove the requests
    service.unqueueUpdateRequest(service.LOW_PRIORITY);
    assert.equal(service.getRequestProperty(service.HIGH_PRIORITY).length, 2);
    assert.equal(service.getRequestProperty(service.LOW_PRIORITY).length, 0);

    service.unqueueUpdateRequest();
    assert.equal(service.getRequestProperty(service.HIGH_PRIORITY).length, 0);
};

// QueueService Events test

exports.testQueueEvents = function(assert, done) {
    let service = QueueService.getServiceForProvider("test"), count = 0,
        listener = function() {
            if(++count == 4) {
                assert.pass("All "+count+" listeners called");
                QueueService.removeQueueListeners(listener, listener);
                done();
            }
            else {

                assert.pass("Listener number "+count+" called");
            }
            // for requeue.
            return false;
        };
    QueueService.addQueueListeners(listener, listener);
    service.queueRequest("http://example.com", {}, listener).then(listener);
};

require("sdk/test").run(exports);

