/**
 * Test the channels manager.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { ChannelsManager } = requireHelper("../lib/channel/manager");
const tabs = require("sdk/tabs");
const { wait } = require("./event/helpers");
const { Channel, User } = requireHelper("../lib/channel/core");
const { defer } = require("sdk/core/promise");
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
    cm.open();
    yield wait(tabs, "ready");
    assert.equal(cm.managerTab, tabs.activeTab);

    tabs.open({url: "https://example.com" });
    yield wait(tabs, "ready");
    let tab = tabs.activeTab;

    cm.open();
    yield wait(tabs, "activate");
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
    let cm = new ChannelsManager();
    let p = defer();
    cm.worker = getFakeWorker(p.resolve);

    cm.loading = false;
    let event = yield p.promise;
    assert.equal(event, "doneloading");

    p = defer();
    cm.worker = getFakeWorker(p.resolve);

    cm.loading = true;
    event = yield p.promise;
    assert.equal(event, "isloading");

    cm.destroy();
};

exports.testCallbacksLoading = function(assert) {
    let cm = new ChannelsManager();

    cm.onChannelAdded(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onChannelUpdated();
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserAdded(FAKE_ITEM);
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserUpdated();
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
    let cm = new ChannelsManager();
    let ignoreLoadingWrapper = (res) => {
        return (event) => {
            if(event !== "doneloading" && event !== "isloading")
                res(event);
        };
    };
    let p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onChannelAdded(FAKE_ITEM);
    let event = yield p.promise;
    assert.equal(event, "add");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onChannelUpdated(FAKE_ITEM);
    event = yield p.promise;
    assert.equal(event, "update");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onChannelRemoved();
    event = yield p.promise;
    assert.equal(event, "remove");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onUserAdded(FAKE_ITEM);
    event = yield p.promise;
    assert.equal(event, "adduser");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onUserUpdated(FAKE_ITEM);
    event = yield p.promise;
    assert.equal(event, "updateuser");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onUserRemoved();
    event = yield p.promise;
    assert.equal(event, "removeuser");

    p = defer();
    cm.worker = getFakeWorker(ignoreLoadingWrapper(p.resolve));

    cm.onError();
    event = yield p.promise;
    assert.equal(event, "error");

    cm.onError("test");
    event = yield p.promise;
    assert.equal(event, "error");

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
    } catch(e) {
        assert.fail(e);
    }
};

exports.testAddProviders = function*(assert) {
    let cm = new ChannelsManager();

    let p = defer();
    cm.worker = getFakeWorker(p.resolve);

    cm.addProviders("test");
    let event = yield p.promise;
    assert.equal(event, "addproviders");

    cm.destroy();
};

require("sdk/test").run(exports);
