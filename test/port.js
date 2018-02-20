import test from 'ava';
import Port, {
    NoPortError, PortGoneError
} from '../src/port';
import getPort from './helpers/port';
import { when } from '../src/utils';
import sinon from 'sinon';

test.afterEach(() => {
    browser.runtime.onConnect._listeners.length = 0;
});

test("static property", (t) => {
    t.true("REPLY_SUFFIX" in Port);
});

test.serial("Open port", (t) => {
    const port = getPort();
    port.name = "test-port";
    browser.runtime.connect.returns(port);
    const p = new Port(port.name, true);

    t.true(browser.runtime.connect.calledOnce);
    t.is(browser.runtime.connect.lastCall.args[0].name, port.name);
    t.is(p.port, port);

    browser.runtime.connect.reset();
});

test.serial("Connect to port", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    const connected = when(p, "connect");

    browser.runtime.onConnect.dispatch(port);
    await connected;
    t.is(p.port, port);
});

test.serial("port disconnect", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);

    browser.runtime.onConnect.dispatch(port);
    const promise = when(p, "disconnect");
    port.onDisconnect.dispatch();

    await promise;
    await t.throws(p.disconnectPromise, PortGoneError);
    t.falsy(p.port);
});

const testMessageEvent = async (t, event, send) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);

    browser.runtime.onConnect.dispatch(port);

    const promise = when(p, event);
    port.onMessage.dispatch(send);
    const { detail: message } = await promise;
    t.deepEqual(message, send);
};
test.serial("named command event", testMessageEvent, "test", {
    command: "test",
    payload: "asdf"
});
test.serial("message event", testMessageEvent, "message", {
    command: "test"
});
test.serial("message event for message command", testMessageEvent, "message", {
    command: "message"
});

test.serial("send message", (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    p.send("test", "asdf");

    t.true(port.postMessage.calledOnce);
    t.deepEqual(port.postMessage.lastCall.args[0], {
        command: "test",
        payload: "asdf"
    });
});

test.serial("send message on custom payload property", (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    p.send("test", "foo", "bar");

    t.true(port.postMessage.calledOnce);
    t.deepEqual(port.postMessage.lastCall.args[0], {
        command: "test",
        bar: "foo"
    });
});

test.serial("reply", (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    p.reply("test", "foo bar");

    t.true(port.postMessage.calledOnce);
    t.deepEqual(port.postMessage.lastCall.args[0], {
        command: `test${Port.REPLY_SUFFIX}`,
        payload: "foo bar"
    });
});

test.serial("reply with error", (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    p.replyError("test", "bar baz");

    t.true(port.postMessage.calledOnce);
    t.deepEqual(port.postMessage.lastCall.args[0], {
        command: `test${Port.REPLY_SUFFIX}`,
        error: "bar baz"
    });
});

test.serial("request", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    const promise = p.request("test");

    t.true(port.postMessage.calledOnce);
    t.is(port.postMessage.lastCall.args[0].command, "test");

    port.onMessage.dispatch({
        command: `test${Port.REPLY_SUFFIX}`,
        payload: "lorem ipsum"
    });

    const reply = await promise;

    t.is(reply, "lorem ipsum");
});

test.serial("duplicate port", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    const secondPort = getPort();
    secondPort.name = port.name;
    const promise = when(p, "duplicate");

    browser.runtime.onConnect.dispatch(secondPort);
    const { detail: wrappedPort } = await promise;
    t.is(wrappedPort.port, secondPort);
    //TODO more verification?
});

test.serial("request rejected due to disconnect", (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    const promise = p.request("test");

    port.onDisconnect.dispatch();
    return t.throws(promise, PortGoneError);
});

test("request rejected due to no port", (t) => {
    const p = new Port("test-port");

    return t.throws(p.request("test"), NoPortError);
});

test.serial("request rejected due to error", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    const promise = p.request("test");

    port.onMessage.dispatch({
        command: `test${Port.REPLY_SUFFIX}`,
        error: "foo baz"
    });

    const error = await t.throws(promise);
    t.is(error, "foo baz");
});

test.serial("prevent default of command event prevents message event", async (t) => {
    const port = getPort();
    port.name = "test-port";
    const p = new Port(port.name);
    browser.runtime.onConnect.dispatch(port);

    const promise = new Promise((resolve) => {
        p.addEventListener("test", (e) => {
            e.preventDefault();
            resolve();
        }, {
            passive: false,
            capture: false,
            once: true
        });
    });
    const messageSpy = sinon.spy();

    p.addEventListener("message", messageSpy);

    port.onMessage.dispatch({
        command: "test"
    });
    await promise;

    t.false(messageSpy.called);
});
