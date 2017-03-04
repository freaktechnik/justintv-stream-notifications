/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import QueueService from "../../../src/background/queue/service";
import prefs from "../../../src/prefs.json";
import sinon from 'sinon';

let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});

test.after(() => {
    clock.restore();
});

test("Get Service", (t) => {
    const service = QueueService.getServiceForProvider("test");
    t.is(service, QueueService.getServiceForProvider("test"));
    t.not(service, QueueService.getServiceForProvider("equal"));
});

test.serial("Interval Pause Resume", (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = sinon.spy();

    service.queueUpdateRequest([ "http://localhost" ], service.HIGH_PRIORITY, cbk);
    QueueService.setOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });

    clock.tick(700);

    t.true(cbk.calledOnce);
    QueueService.pause();

    clock.tick(500);
    QueueService.resume();

    clock.tick(700);

    t.true(cbk.calledTwice);

    QueueService.updateOptions(0);
    service.unqueueUpdateRequest(service.HIGH_PRIORITY);
});

// QueueService Object Tests

test.serial("Update Request Requeue", (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = sinon.stub();
    cbk.returns(true);
    cbk.onSecondCall().returns(false);

    const endCbk = sinon.spy();

    service.queueUpdateRequest([ "http://localhost" ], service.HIGH_PRIORITY, endCbk, {}, cbk);
    QueueService.setOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });

    clock.tick(1400);

    t.true(cbk.calledTwice);
    t.true(endCbk.calledOnce);

    service.unqueueUpdateRequest();
    QueueService.updateOptions(0);
});

test.serial("Requeue", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = sinon.stub();

    cbk.returns(true);
    cbk.onCall(prefs.queueservice_maxRetries.value + 2).returns(false);

    service.queueRequest("http://localhost", {}, cbk)
        .then((d) => t.fail(d));
    QueueService.setOptions({
        interval: 70,
        amount: 1,
        maxSize: 1
    });

    clock.tick((prefs.queueservice_maxRetries.value + 2) * 70);

    t.is(cbk.callCount, prefs.queueservice_maxRetries.value + 1);
    QueueService.updateOptions(0);
});

test("Queue Service", (t) => {
    const service = QueueService.getServiceForProvider("test");
    t.true(Array.isArray(service.highPriorityRequestIds));
    t.true(Array.isArray(service.lowPriorityRequestIds));
    t.is(service.highPriorityRequestIds.length, 0);
    t.is(service.lowPriorityRequestIds.length, 0);
    t.true(service.HIGH_PRIORITY, "QueueService instance exposes HIGH_PRIORITY constant");
    t.true(service.LOW_PRIORITY, "QueueService isntance exposes LOW_PRIORITY constant");
});

test("Queue Request", async (t) => {
    t.plan(1);
    const service = QueueService.getServiceForProvider("test");
    await service.queueRequest("http://locahost", {}, () => {
        t.pass("Requeueing function called");
        return false;
    });
});

test("Update Request", (t) => {
    const service = QueueService.getServiceForProvider("test");
    service.queueUpdateRequest([ "http://localhost" ],
        service.HIGH_PRIORITY,
        () => {
            t.pass("done");
        },
        {},
        () => {
            return false;
        }
    );
    t.is(service.getRequestProperty(service.HIGH_PRIORITY).length, 1);
    t.is(service.getRequestProperty(service.HIGH_PRIORITY), service.highPriorityRequestIds);
    t.is(service.getRequestProperty(service.LOW_PRIORITY).length, 0);
    const id = service.highPriorityRequestIds[0];
    // Replace them
    service.queueUpdateRequest([ "http://localhost", "https://localhost" ],
        service.HIGH_PRIORITY,
        () => {
            t.pass("done");
        },
        {},
        () => {
            return false;
        }
    );
    t.is(service.getRequestProperty(service.HIGH_PRIORITY).length, 2);
    t.true(service.getRequestProperty(service.HIGH_PRIORITY).every((i) => i != id));

    // remove the requests
    service.unqueueUpdateRequest(service.LOW_PRIORITY);
    t.is(service.getRequestProperty(service.HIGH_PRIORITY).length, 2);
    t.is(service.getRequestProperty(service.LOW_PRIORITY).length, 0);

    service.unqueueUpdateRequest();
    t.is(service.getRequestProperty(service.HIGH_PRIORITY).length, 0);
});

// QueueService Events test

test("Queue Events", async (t) => {
    const service = QueueService.getServiceForProvider("test"),
        listener = sinon.spy(() => false);
    QueueService.addListeners({
        containsPriorized: listener,
        priorizedLoaded: listener
    });
    await service.queueRequest("http://locahost", {}, listener);

    t.true(listener.calledThrice);
    QueueService.removeListeners({
        containsPriorized: listener,
        priorizedLoaded: listener
    });
});

test.serial("Queue Pause Resume", (t) => {
    const listenerPause = sinon.spy(),
        listenerResume = sinon.spy();

    QueueService.setOptions({
        interval: 25,
        amount: 0.5,
        maxSize: 2
    });
    QueueService.addListeners({
        paused: listenerPause,
        resumed: listenerResume
    });
    QueueService.pause();

    t.true(listenerPause.calledOnce);
    t.true(listenerResume.notCalled);

    QueueService.resume();

    t.true(listenerPause.calledOnce);
    t.true(listenerResume.calledOnce);

    QueueService.pause();

    t.true(listenerPause.calledTwice);
    t.true(listenerResume.calledOnce);
});
