/**
 * Test the channels manager.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import ChannelsManager from "../../../src/background/channel/manager";
import getPort from '../../helpers/port';
import { when } from '../../../src/utils';

const FAKE_ITEM = {
        serialize() {
            // nuthin
        }
    },
    getManagerPort = (name = 'manager') => {
        const port = getPort();
        port.name = name;
        port.sender = {
            tab: {
                id: name
            }
        };
        return port;
    };

test.beforeEach(() => {
    browser.tabs.create.returns(Promise.resolve({
        id: 0
    }));
});

test.afterEach(() => {
    browser.tabs.create.reset();
    browser.tabs.update.reset();
});

test.serial("Tab", async (t) => {
    const cm = new ChannelsManager();

    t.is(cm.tabID, null);

    await cm.open();

    t.not(cm.tabID, null);
    t.true(browser.tabs.create.calledOnce);

    await cm.open();

    t.true(browser.tabs.update.calledOnce);
});

test("Loading", (t) => {
    const cm = new ChannelsManager();
    t.true(cm.loading);
    cm.loading = false;
    t.false(cm.loading);
    cm.loading = true;
    t.true(cm.loading);
});

test("Loading with Worker", (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    cm.loading = false;
    t.is(port.postMessage.lastCall.args[0].target, 'doneloading');

    cm.loading = true;
    t.is(port.postMessage.lastCall.args[0].target, 'isloading');
});

test("Callbacks Loading", (t) => {
    const cm = new ChannelsManager();

    cm.onChannelAdded(FAKE_ITEM);
    t.false(cm.loading);

    cm.loading = true;
    cm.onChannelUpdated(FAKE_ITEM);
    t.false(cm.loading);

    cm.loading = true;
    cm.onUserAdded(FAKE_ITEM);
    t.false(cm.loading);

    cm.loading = true;
    cm.onUserUpdated(FAKE_ITEM);
    t.false(cm.loading);

    cm.loading = true;
    cm.onError();
    t.false(cm.loading);

    cm.loading = true;
    cm.onCancel();
    t.false(cm.loading);
});

test("Callbacks", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    cm.onChannelAdded(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].target, 'add');

    cm.onChannelUpdated(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].target, 'update');

    cm.onChannelRemoved();
    t.is(port.postMessage.lastCall.args[0].target, 'remove');

    cm.onUserAdded(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].target, 'adduser');

    cm.onUserUpdated(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].target, 'updateuser');

    cm.onUserRemoved();
    t.is(port.postMessage.lastCall.args[0].target, 'removeuser');

    cm.onError();
    t.is(port.postMessage.lastCall.args[0].target, 'error');

    cm.onError("test");
    t.is(port.postMessage.lastCall.args[0].target, 'error');
    t.is(port.postMessage.lastCall.args[0].data[0], 'test');

    cm.setTheme(0);
    t.is(port.postMessage.lastCall.args[0].target, 'theme');
    t.is(port.postMessage.lastCall.args[0].data, 0);
});

test("Make Sure No Throws", (t) => {
    const cm = new ChannelsManager();

    t.notThrows(() => cm.addProviders("test"));
    t.notThrows(() => cm.onChannelAdded(FAKE_ITEM));
    t.notThrows(() => cm.onChannelUpdated(FAKE_ITEM));
    t.notThrows(() => cm.onChannelRemoved());
    t.notThrows(() => cm.onUserAdded(FAKE_ITEM));
    t.notThrows(() => cm.onUserUpdated(FAKE_ITEM));
    t.notThrows(() => cm.onUserRemoved());
    t.notThrows(() => cm.onError());
    t.notThrows(() => cm.setTheme());
});

test("add providers", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    cm.addProviders("test");
    t.is(port.postMessage.lastCall.args[0].target, 'addproviders');
    t.is(port.postMessage.lastCall.args[0].data, 'test');
});

test("Detaching Worker Without Closing Tab", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    const p = when(cm, 'getdata');
    port.onMessage.dispatch({
        target: "ready"
    });
    await p;

    t.not(cm.port, null);

    port.onDisconnect.dispatch();

    t.is(cm.port, null);
});

test("Additional Manager", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    const p = when(cm, 'getdata');
    port.onMessage.dispatch({
        target: "ready"
    });
    await p;

    const secondPort = getManagerPort('manager2');
    cm._setupPort(secondPort);

    t.is(cm.port.name, 'manager');
    secondPort.onMessage.dispatch({
        target: "ready"
    });
    t.true(secondPort.postMessage.called);
    t.is(secondPort.postMessage.lastCall.args[0].target, 'secondary');
});

test.serial("Additional Manager to Primary", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    cm._setupPort(port);

    const p = when(cm, 'getdata');
    port.onMessage.dispatch({
        target: "ready"
    });
    await p;

    const secondPort = getManagerPort('manager2');
    cm._setupPort(secondPort);

    t.is(cm.port.name, 'manager');
    secondPort.onMessage.dispatch({
        target: "ready"
    });

    secondPort.onMessage.dispatch({
        target: 'focus'
    });
    t.true(browser.tabs.update.calledOnce);

    port.onDisconnect.dispatch();

    secondPort.onMessage.dispatch({
        target: 'focus'
    });
    t.is(secondPort.postMessage.lastCall.args[0].target, 'reload');

    cm._setupPort(secondPort);
    t.is(cm.port.name, 'manager2', "Reloading makes secondary primary tab");
});
