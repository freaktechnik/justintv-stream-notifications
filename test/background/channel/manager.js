/**
 * Test the channels manager.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import ChannelsManager from "../../../src/background/channel/manager";
import getPort from '../../helpers/port';
import { when } from '../../../src/utils';
import { PortGoneError, default as Port } from '../../../src/port';

const FAKE_ITEM = {
        serialize() {
            // nuthin
        }
    },
    getManagerPort = (name = 'manager') => {
        const port = getPort();
        port.name = 'manager';
        port.sender = {
            tab: {
                id: name
            }
        };
        return port;
    };

test.beforeEach(() => {
    browser.tabs.create.resolves({
        id: 0
    });
});

test.afterEach(() => {
    browser.tabs.create.reset();
    browser.tabs.update.reset();
    browser.runtime.onConnect._listeners.length = 0;
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

test.serial("Loading with Worker", (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    cm.loading = false;
    t.is(port.postMessage.lastCall.args[0].command, 'doneloading');

    cm.loading = true;
    t.is(port.postMessage.lastCall.args[0].command, 'isloading');
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

test.serial("Callbacks", (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    cm.onChannelAdded(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].command, 'add');

    cm.onChannelUpdated(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].command, 'update');

    cm.onChannelRemoved();
    t.is(port.postMessage.lastCall.args[0].command, 'remove');

    cm.onUserAdded(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].command, 'adduser');

    cm.onUserUpdated(FAKE_ITEM);
    t.is(port.postMessage.lastCall.args[0].command, 'updateuser');

    cm.onUserRemoved();
    t.is(port.postMessage.lastCall.args[0].command, 'removeuser');

    cm.onError();
    t.is(port.postMessage.lastCall.args[0].command, 'error');

    cm.onError("test");
    t.is(port.postMessage.lastCall.args[0].command, 'error');
    t.is(port.postMessage.lastCall.args[0].payload[0], 'test');

    cm.setTheme(0);
    t.is(port.postMessage.lastCall.args[0].command, 'theme');
    t.is(port.postMessage.lastCall.args[0].payload, 0);

    cm.copyDump('foo');
    t.is(port.postMessage.lastCall.args[0].command, `debugdump${Port.REPLY_SUFFIX}`);
    t.is(port.postMessage.lastCall.args[0].payload, 'foo');
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
    t.notThrows(() => cm.copyDump());
});

test.serial("add providers", (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    cm.addProviders("test");
    t.is(port.postMessage.lastCall.args[0].command, 'addproviders');
    t.is(port.postMessage.lastCall.args[0].payload, 'test');
});

test.serial("Detaching Worker Without Closing Tab", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    port.onMessage.dispatch({
        command: "ready"
    });

    t.not(cm.tabID, null);

    port.onDisconnect.dispatch();

    await t.throws(cm.port.disconnectPromise, PortGoneError);
    t.is(cm.tabID, null);
});

test.serial("Additional Manager", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    port.onMessage.dispatch({
        command: "ready"
    });

    const secondPort = getManagerPort('manager2');
    const spp = when(cm.port, "duplicate");
    browser.runtime.onConnect.dispatch(secondPort);
    const { detail: spw } = await spp;

    t.is(cm.tabID, 'manager');
    const fp = when(spw, 'ready');
    secondPort.onMessage.dispatch({
        command: "ready"
    });
    await fp;

    t.true(secondPort.postMessage.called);
    t.is(secondPort.postMessage.lastCall.args[0].command, 'secondary');
});

test.serial("Additional Manager to Primary", async (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    port.onMessage.dispatch({
        command: "ready"
    });

    const secondPort = getManagerPort('manager2');
    const spp = when(cm.port, 'duplicate');
    browser.runtime.onConnect.dispatch(secondPort);
    const { detail: spw } = await spp;

    t.is(cm.tabID, 'manager');
    secondPort.onMessage.dispatch({
        command: "ready"
    });

    let fp = when(spw, 'focus');
    secondPort.onMessage.dispatch({
        command: 'focus'
    });
    await fp;

    t.true(browser.tabs.update.calledOnce);

    port.onDisconnect.dispatch();
    await t.throws(cm.port.disconnectPromise, PortGoneError);

    fp = when(spw, 'focus');
    secondPort.onMessage.dispatch({
        command: 'focus'
    });
    await fp;

    t.is(secondPort.postMessage.lastCall.args[0].command, 'reload');
    secondPort.onDisconnect.dispatch();
    await t.throws(spw.disconnectPromise, PortGoneError);

    const spr = when(cm.port, 'connect');
    browser.runtime.onConnect.dispatch(secondPort);
    await spr;
    t.is(cm.tabID, 'manager2', "Reloading makes secondary primary tab");
});

const loadingEvent = (t, event) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    port.onMessage.dispatch({
        command: event
    });

    t.true(cm.loading);
};
loadingEvent.title = (title, event) => `${title} ${event}`;
[
    'updatefavorites',
    'updatechannel',
    'autoadd'
].forEach((e) => test('loading triggered by', loadingEvent, e));

test('cancel event', (t) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    port.onMessage.dispatch({
        command: 'cancel',
        payload: [
            'foo',
            'bar'
        ]
    });

    t.false(cm.loading);
    t.true(cm.cancelingValues.get('foobar'));
});

const forwardingEvents = async (t, info) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    const p = when(cm, info.outEvent);
    port.onMessage.dispatch({
        command: info.inEvent,
        payload: info.payload
    });

    const { detail: forwarded } = await p;
    if(Array.isArray(info.sent)) {
        for(const i in info.sent) {
            t.is(forwarded[i], info.sent[i]);
        }
    }
    else {
        t.is(forwarded, info.sent);
    }
};
forwardingEvents.title = (title, info) => `${title} ${info.inEvent} to ${info.outEvent}`;

const cancelEvent = async (t, info) => {
    const cm = new ChannelsManager();
    const port = getManagerPort();
    browser.runtime.onConnect.dispatch(port);

    const p = when(cm, info.outEvent);
    port.onMessage.dispatch({
        command: info.inEvent,
        payload: info.payload
    });

    const { detail: forwarded } = await p;
    t.is(typeof forwarded[2], "function");

    t.false(forwarded[2]());

    const cancelType = info.outEvent === 'adduser' ? 'user' : 'channel';

    port.onMessage.dispatch({
        command: 'cancel',
        payload: [
            cancelType,
            forwarded[1],
            forwarded[0]
        ]
    });

    t.true(forwarded[2]());
};
cancelEvent.title = (title, info) => `${title} ${info.outEvent}`;

const eventForwardFixture = [
    {
        inEvent: 'adduser',
        payload: {
            username: 'foo',
            type: 'bar'
        },
        outEvent: 'adduser',
        sent: [
            'foo',
            'bar'
        ]
    },
    {
        inEvent: 'addchannel',
        payload: {
            username: 'foo',
            type: 'bar'
        },
        outEvent: 'addchannel',
        sent: [
            'foo',
            'bar'
        ]
    },
    {
        inEvent: 'removechannel',
        payload: 'foo',
        outEvent: 'removechannel',
        sent: 'foo'
    },
    {
        inEvent: 'removeuser',
        payload: {
            userId: 'foo',
            removeFollows: false
        },
        outEvent: 'removeuser',
        sent: [
            'foo',
            false
        ]
    },
    {
        inEvent: 'updatefavorites',
        payload: 'foo',
        outEvent: 'updatefavorites',
        sent: 'foo'
    },
    {
        inEvent: 'updatechannel',
        payload: 'foo',
        outEvent: 'updatechannel',
        sent: 'foo'
    },
    {
        inEvent: 'autoadd',
        payload: 'foo',
        outEvent: 'autoadd',
        sent: 'foo'
    },
    {
        inEvent: 'debugdump',
        outEvent: 'debugdump',
        sent: undefined
    },
    {
        inEvent: 'showoptions',
        outEvent: 'showoptions',
        sent: undefined
    }
];
const cancelableEvents = [
    'adduser',
    'addchannel'
];

for(const info of eventForwardFixture) {
    if(cancelableEvents.includes(info.inEvent)) {
        test('canceling', cancelEvent, info);
    }
    test('forwards', forwardingEvents, info);
}
