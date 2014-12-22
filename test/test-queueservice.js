/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
const QueueService = require("../lib/queueservice");

exports.testGetService = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    assert.equal(service, QueueService.getServiceForProvider("test"));
    assert.notEqual(service, QueueService.getServiceForProvider("equal"));
};

// QueueService Object Tests

exports.testQueueService = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    assert.ok(Array.isArray(service.updateRequestIds));
    assert.equal(service.updateRequestIds.length, 0);
};

exports.testQueueRequest = function(assert, done) {
    let service = QueueService.getServiceForProvider("test");
    service.queueRequest("http://example.com", {},
        function(data) {
            assert.pass("Requeueing function called");
            return false;
        },
        function(data) {
            assert.pass("Request completed");
            done();
        }
    );
};

exports.testUpdateRequest = function(assert) {
    let service = QueueService.getServiceForProvider("test");
    service.queueUpdateRequest(["http://example.com"], {},
        function() { console.log("requeue?"); return false; },
        function() { console.log("done"); }
    );
    assert.equal(service.updateRequestIds.length, 1);
    var id = service.updateRequestIds[0];
    // Replace them
    service.queueUpdateRequest(["http://example.com", "http:/example.com"], {},
        function() { console.log("requeue?"); return false; },
        function() { console.log("done"); }
    );
    assert.equal(service.updateRequestIds.length, 2);
    assert.ok(service.updateRequestIds.every(function(i) {
        return i != id;
    }));

    // remove the requests
    service.unqueueUpdateRequest();
    assert.equal(service.updateRequestIds.length, 0);
};

// QueueService Events test

exports.testQueueEvents = function(assert, done) {
    let service = QueueService.getServiceForProvider("test"), count = 0,
        listener = function() {
            if(++count == 4) {
                assert.pass("All "+count+" listeners called");
                done();
            }
            else {
                assert.pass("Listener number "+count+" called");
            }
        };
    QueueService.addQueueListeners(listener, listener);
    service.queueRequest("http://example.com", {}, listener, listener);
};

require("sdk/test").run(exports);

