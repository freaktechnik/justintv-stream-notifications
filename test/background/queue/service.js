/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import * as QueueService from "../../../src/background/queue/service";
import prefs from "../../../src/prefs.json";
import sinon from 'sinon';
import { promiseSpy } from '../../helpers/promise-spy';

const QUEUE_ALARM_NAME = "main-queue";
const spinQueue = () => {
    browser.alarms.onAlarm.dispatch({
        name: QUEUE_ALARM_NAME
    });
};

test.serial.beforeEach(() => {
    browser.alarms.create.reset();
    browser.alarms.clear.reset();
});

test("Get Service", (t) => {
    const service = QueueService.getServiceForProvider("test");
    t.is(service, QueueService.getServiceForProvider("test"));
    t.not(service, QueueService.getServiceForProvider("equal"));
});

test.serial("Interval Pause Resume", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = promiseSpy();

    service.queueUpdateRequest([ "http://localhost" ], service.HIGH_PRIORITY, cbk);
    QueueService.setOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });
    t.true(browser.alarms.create.notCalled);

    //clock.tick(700);
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledOnce);
    cbk.setupPromise();

    QueueService.pause();
    t.true(browser.alarms.clear.calledOnce);
    t.is(browser.alarms.clear.firstCall.args[0], QUEUE_ALARM_NAME);

    //clock.tick(700);

    QueueService.resume();

    t.true(browser.alarms.create.calledOnce);

    //clock.tick(700);
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledTwice);

    QueueService.updateOptions(0);
    service.unqueueUpdateRequest(service.HIGH_PRIORITY);
});

// QueueService Object Tests

test.serial("Update Request Requeue", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = promiseSpy(() => {
        return cbk.callCount < 2;
    });

    const endCbk = promiseSpy();

    service.queueUpdateRequest([ "http://localhost" ], service.HIGH_PRIORITY, endCbk, {}, cbk);
    QueueService.setOptions({
        interval: 700,
        amount: 1,
        maxSize: 1
    });

    //clock.tick(1400);
    spinQueue();
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledTwice);
    // Request was requeued once.
    t.true(endCbk.calledOnce);

    service.unqueueUpdateRequest();
    QueueService.updateOptions(0);
});

test.serial.failing("Requeue", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = promiseSpy(() => {
        //return prefs.queueservice_maxRetries.value > cbk.callCount;
        return false;
    });

    const p = service.queueRequest("http://localhost", {}, cbk);
    QueueService.setOptions({
        interval: 70,
        amount: 1,
        maxSize: 1
    });

    //clock.tick((prefs.queueservice_maxRetries.value + 2) * 70);
    for(let i = 1; cbk.lastCall.returned || i == 1; ++i) {
        spinQueue();
        await cbk.promise;
        // have to wait for browser.storage.local.get("queueservice_maxRetries")
        cbk.setupPromise();

        t.is(cbk.callCount, i);
    }
    await p;

    t.is(cbk.callCount, prefs.queueservice_maxRetries.value + 1);
    QueueService.updateOptions(0);
});

test("Queue Service", (t) => {
    const service = QueueService.getServiceForProvider("test");
    t.true(Array.isArray(service.highPriorityRequestIds));
    t.true(Array.isArray(service.lowPriorityRequestIds));
    t.is(service.highPriorityRequestIds.length, 0);
    t.is(service.lowPriorityRequestIds.length, 0);
    t.true("HIGH_PRIORITY" in service, "QueueService instance exposes HIGH_PRIORITY constant");
    t.true("LOW_PRIORITY" in service, "QueueService isntance exposes LOW_PRIORITY constant");
});

test("Queue Request", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = sinon.spy(() => false);
    await service.queueRequest("http://locahost", {}, cbk);
    t.true(cbk.calledOnce);
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
