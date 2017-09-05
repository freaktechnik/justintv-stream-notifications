/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from 'ava';
import * as QueueService from "../../../src/background/queue/service";
import prefs from "../../../src/prefs.json";
import sinon from 'sinon';
import { promiseSpy } from '../../helpers/promise-spy';

const spinQueue = (name) => {
    browser.alarms.onAlarm.dispatch({
        name
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

    await service.queueUpdateRequest({
        getURLs() {
            return Promise.resolve([ "http://localhost" ]);
        },
        priority: service.HIGH_PRIORITY,
        onComplete: cbk
    });
    t.true(browser.alarms.create.calledOnce);

    //clock.tick(700);
    spinQueue(service.getAlarmName(service.HIGH_PRIORITY));
    await cbk.promise;

    t.true(cbk.calledOnce);
    cbk.setupPromise();

    QueueService.pause();
    t.true(browser.alarms.clear.notCalled);

    //clock.tick(700);

    QueueService.resume();

    t.true(browser.alarms.create.calledOnce);

    //clock.tick(700);
    spinQueue();
    await cbk.promise;

    t.true(cbk.calledTwice);

    service.unqueueUpdateRequest(service.HIGH_PRIORITY);

    t.true(browser.alarms.clear.calledOnce);
});

// QueueService Object Tests

test.serial("Update Request queue", async (t) => {
    const service = QueueService.getServiceForProvider("test");

    const cbk = promiseSpy();
    const endCbk = promiseSpy();

    service.queueUpdateRequest({
        getURLs() {
            cbk();
            return Promise.resolve([ "http://localhost" ]);
        },
        priority: service.HIGH_PRIORITY,
        onComplete: endCbk
    });

    spinQueue(service.getAlarmName(service.HIGH_PRIORITY));
    await endCbk.promise;

    t.true(cbk.calledOnce);
    t.true(endCbk.calledOnce);

    service.unqueueUpdateRequest();
});

test.serial.failing("Requeue", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = promiseSpy(() => {
        //return prefs.queueservice_maxRetries.value > cbk.callCount;
        return false;
    });

    const p = service.queueRequest("http://localhost", {}, cbk);

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
});

test("Queue Service", (t) => {
    const service = QueueService.getServiceForProvider("test");
    t.true("HIGH_PRIORITY" in service, "QueueService instance exposes HIGH_PRIORITY constant");
    t.true("LOW_PRIORITY" in service, "QueueService isntance exposes LOW_PRIORITY constant");
});

test("Queue Request", async (t) => {
    const service = QueueService.getServiceForProvider("test");
    const cbk = sinon.spy(() => false);
    await service.queueRequest("http://locahost", {}, cbk);
    t.true(cbk.calledOnce);
});

test.serial("Update Request", (t) => {
    const service = QueueService.getServiceForProvider("test");
    service.queueUpdateRequest({
        getURLs() {
            return Promise.resolve([ "http://localhost" ]);
        },
        priority: service.HIGH_PRIORITY,
        onComplete() {
            t.pass("done");
        }
    });
    t.not(service[service.getRequestProperty(service.HIGH_PRIORITY)], undefined);
    t.is(service[service.getRequestProperty(service.LOW_PRIORITY)], undefined);
    // Replace them
    service.queueUpdateRequest({
        getURLs() {
            return Promise.resolve([ "http://localhost", "https://localhost" ]);
        },
        priority: service.HIGH_PRIORITY,
        onComplete() {
            t.pass("done");
        }
    });
    t.not(service[service.getRequestProperty(service.HIGH_PRIORITY)], undefined);
    // remove the requests
    service.unqueueUpdateRequest(service.LOW_PRIORITY);
    t.not(service[service.getRequestProperty(service.HIGH_PRIORITY)], undefined);
    service.unqueueUpdateRequest();
    t.is(service[service.getRequestProperty(service.HIGH_PRIORITY)], undefined);
});

// QueueService Events test
test.serial("Queue Pause Resume", (t) => {
    const listenerPause = sinon.spy(),
        listenerResume = sinon.spy();

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

test.todo("service.hasUpdateRequest");
