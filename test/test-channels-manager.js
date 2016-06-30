/**
 * Test the channels manager.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const ChannelsManager = requireHelper("../lib/channel/manager").default;
const tabs = require("sdk/tabs");
const { wait } = require("./event/helpers");
const { Channel, User } = requireHelper("../lib/channel/core");
const self = require("sdk/self");

const getFakeWorker = (portCallback) => {
    return {
        port: {
            emit: portCallback
        }
    };
};
const FAKE_ITEM = {
    serialize: () => {}
};

exports.testTab = function*(assert) {
    let cm = new ChannelsManager();
    yield cm.open();
    assert.equal(cm.managerTab, tabs.activeTab);

    tabs.open({url: self.data.url("list.html") });
    yield wait(tabs, "ready");
    let tab = tabs.activeTab;

    yield cm.open();
    assert.equal(cm.managerTab, tabs.activeTab);

    tab.close();
    cm.managerTab.close();
    cm.destroy();
};

exports.testAlreadyOpenTab = function*(assert) {
    tabs.open({url: self.data.url("./channels-manager.html")});
    yield wait(tabs, "ready");
    let tab = tabs.activeTab;

    let cm = new ChannelsManager();
    assert.equal(cm.managerTab, tab);

    tab.close();
    cm.destroy();
};

exports.testTabWithHash = function*(assert) {
    let existingCm = new ChannelsManager();

    tabs.open({url: self.data.url("./channels-manager.html") + "#popup"});
    yield wait(tabs, "ready");
    let tab = tabs.activeTab;

    let cm = new ChannelsManager();
    assert.equal(cm.managerTab, tab);
    assert.equal(existingCm.managerTab, tab);

    cm.destroy();
    existingCm.destroy();
};

exports.testLoading = function(assert) {
    let cm = new ChannelsManager();
    assert.ok(cm.loading);
    cm.loading = false;
    assert.ok(!cm.loading);
    cm.loading = true;
    assert.ok(cm.loading);

    cm.destroy();
};

exports.testLoadingWithWorker = function*(assert) {
    const cm = new ChannelsManager();
    cm.mod.destroy();

    let p = new Promise((resolve) =>cm.worker = getFakeWorker(resolve));
    cm.loading = false;
    let event = yield p;
    assert.equal(event, "doneloading");

    p = new Promise((resolve) =>cm.worker = getFakeWorker(resolve));
    cm.loading = true;
    event = yield p;
    assert.equal(event, "isloading");

    cm.destroy();
};

exports.testCallbacksLoading = function(assert) {
    let cm = new ChannelsManager();

    cm.onChannelAdded(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onChannelUpdated(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserAdded(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserUpdated(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onError();
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onCancel();
    assert.ok(!cm.loading);

    cm.destroy();
};
exports.testCallbacks = function*(assert) {
    const cm = new ChannelsManager();
    const ignoreLoadingWrapper = (res) => {
        return (event) => {
            if(event !== "doneloading" && event !== "isloading")
                res(event);
        };
    };
    cm.mod.destroy();

    let p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onChannelAdded(FAKE_ITEM);
    let event = yield p;
    assert.equal(event, "add");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onChannelUpdated(FAKE_ITEM);
    event = yield p;
    assert.equal(event, "update");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onChannelRemoved();
    event = yield p;
    assert.equal(event, "remove");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onUserAdded(FAKE_ITEM);
    event = yield p;
    assert.equal(event, "adduser");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onUserUpdated(FAKE_ITEM);
    event = yield p;
    assert.equal(event, "updateuser");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onUserRemoved();
    event = yield p;
    assert.equal(event, "removeuser");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onError();
    event = yield p;
    assert.equal(event, "error");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.onError("test");
    event = yield p;
    assert.equal(event, "error");

    p = new Promise((resolve) => cm.worker = getFakeWorker(ignoreLoadingWrapper(resolve)));
    cm.setTheme(0);
    event = yield p;
    assert.equal(event, "theme");

    cm.destroy();
};

exports.testMakeSureNoThrows = function(assert) {
    let cm = new ChannelsManager();

    try {
        cm.addProviders("test");
        cm.onChannelAdded(FAKE_ITEM);
        cm.onChannelUpdated(FAKE_ITEM);
        cm.onChannelRemoved();
        cm.onUserAdded(FAKE_ITEM);
        cm.onUserUpdated(FAKE_ITEM);
        cm.onUserRemoved();
        cm.onError();
        cm.setTheme();
    } catch(e) {
        assert.fail(e);
    }

    cm.destroy();
};

exports.testAddProviders = function*(assert) {
    const cm = new ChannelsManager();

    cm.mod.destroy();
    let p = new Promise((resolve) => cm.worker = getFakeWorker(resolve));

    cm.addProviders("test");
    let event = yield p;
    assert.equal(event, "addproviders");

    cm.destroy();
};

exports.testDetachingWorkerWithoutClosingTab = function*(assert) {
    const cm = new ChannelsManager();

    cm.open();
    yield wait(cm, "getdata");

    assert.notStrictEqual(cm.managerTab, null, "Manager tab open");
    const tabToClose = cm.managerTab;

    cm.worker.detach();
    assert.strictEqual(cm.managerTab, null, "No manager tab known to be open");

    cm.destroy();
    const p = wait(tabToClose, "close");
    tabToClose.close();
    yield p;
};

exports.testAdditionalManager = function*(assert) {
    const cm = new ChannelsManager();

    cm.open();
    yield wait(cm, "getdata");
    assert.notDeepEqual(cm.managerTab, null, "Manager tab was assigned");

    yield tabs.open({ url: cm.managerTab.url });
    yield wait(tabs, "ready");
    const openedTab = tabs.activeTab;

    assert.notEqual(cm.managerTab, openedTab, "Second tab didn't overwrite primary tab");

    let p = wait(openedTab, "close");
    openedTab.close();
    yield p;
    p = wait(cm.managerTab, "close");
    cm.destroy();
    yield p;
};

exports.testAdditionalManagerToPrimary = function*(assert) {
    const cm = new ChannelsManager();

    cm.open();
    yield wait(cm, "getdata");

    yield tabs.open({ url: cm.managerTab.url });
    yield wait(tabs, "ready");
    const openedTab = tabs.activeTab;

    assert.notEqual(cm.managerTab.id, openedTab.id, "second tab didn't replace primary tab");

    let p = wait(cm.managerTab, "close");
    cm.managerTab.close();
    yield p;

    p = wait(openedTab, "ready");
    openedTab.reload();
    yield p;

    assert.equal(cm.managerTab, openedTab, "Reloading makes secondary primary tab");

    p = wait(cm.managerTab, "close");
    cm.destroy();
    yield p;
};


exports.testWorkerDoesntGetReplaced = function*(assert) {
    const cm = new ChannelsManager();

    yield cm.open();
    yield wait(cm, "getdata");

    assert.notStrictEqual(cm.worker, null, "We've got a worker");

    cm.managerTab.close();
    yield wait(cm.worker, "detach");

    assert.strictEqual(cm.worker, null, "Worker's gone");

    cm.worker = "My worker";

    yield cm.open();
    // spin event loop
    yield wait(500);

    assert.equal(cm.worker, "My worker", "Worker wasn't replaced");

    const p = wait(cm.managerTab, "close");
    cm.destroy();
    yield p;
};

exports.testNavigateAway = function*(assert) {
    const cm = new ChannelsManager();

    yield cm.open();
    cm.managerTab.url = self.data.url("list.html");
    yield wait(tabs.activeTab, "ready");

    assert.strictEqual(null, cm.managerTab, "Manager tab gets cleared when navigating away");

    const p = wait(tabs.activeTab, "close");
    tabs.activeTab.close();
    cm.destroy();
    yield p;
};

exports.testNavigateBack = function*(assert) {
    const cm = new ChannelsManager();

    yield cm.open();
    cm.managerTab.url = self.data.url("list.html");
    yield wait(tabs.activeTab, "ready");

    tabs.activeTab.url = self.data.url("channels-manager.html");
    yield wait(tabs.activeTab, "ready");

    assert.equal(tabs.activeTab, cm.managerTab);

    const p = wait(tabs.activeTab, "close");
    cm.destroy();
    yield p;
};

require("sdk/test").run(exports);
