/**
 * Test the channels manager.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { ChannelsManager } = requireHelper("../lib/channels-manager");
const tabs = require("sdk/tabs");
const { when } = require("sdk/event/utils");
const { Channel, User } = requireHelper("../lib/channeluser");
const { defer } = require("sdk/core/promise");

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
    yield when(tabs, "ready");
    assert.equal(cm.managerTab, tabs.activeTab);

    tabs.open({url: "https://example.com" });
    yield when(tabs, "ready");
    let tab = tabs.activeTab;

    cm.open();
    yield when(tabs, "activate");
    assert.equal(cm.managerTab, tabs.activeTab);

    tab.close();
    cm.managerTab.close();
};

exports.testLoading = function(assert) {
    let cm = new ChannelsManager();
    assert.ok(cm.loading);
    cm.loading = false;
    assert.ok(!cm.loading);
    cm.loading = true;
    assert.ok(cm.loading);
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
};

exports.testCallbacksLoading = function(assert) {
    let cm = new ChannelsManager();

    cm.onChannelAdded();
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onChannelUpdated();
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserAdded();
    assert.ok(!cm.loading);

    cm.loading = true;
    cm.onUserUpdated();
    assert.ok(!cm.loading);
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
};

exports.testAddChannel = function*(assert) {
    let cm = new ChannelsManager();
    cm.addChannel("freaktechnik", "twitch");
    let channel = yield when(cm, "addchannel");
    assert.ok(channel instanceof Channel);
    assert.equal(channel.login, "freaktechnik");
    assert.equal(channel.type, "twitch");

    //TODO test ignore null
};

exports.testRemoveChannel = function*(assert) {
    let cm = new ChannelsManager();
    let p = when(cm, "removechannel");

    cm.removeChannel(1);
    let id = yield p;
    assert.equal(id, 1);
};

exports.testAddUserFavorites = function*(assert) {
    let cm = new ChannelsManager();

    let p = when(cm, "adduser");

    cm.addUserFavorites("freaktechnik", "twitch");

    let user = yield p;
    assert.ok(user instanceof User);
    assert.equal(user.login, "freaktechnik");
    assert.equal(user.type, "twitch");
};

exports.testRemoveUser = function*(assert) {
    let cm = new ChannelsManager();

    let p = when(cm, "removeuser");
    cm.removeUser(1);
    let id = yield p;
    assert.equal(id, 1);
};

exports.testUpdateFavorites = function*(assert) {
    let cm = new ChannelsManager();

    let p = when(cm, "updatefavorites");
    cm.updateFavorites();
    let what = yield p;
    assert.ok(!what);
};
exports.testRefreshChannel = function*(assert) {
    let cm = new ChannelsManager();

    let p = when(cm, "updatechannel");
    cm.refreshChannel(1);
    let id = yield p;
    assert.equal(id, 1);
};

exports.testRefreshUserFavorites = function*(assert) {
    let cm = new ChannelsManager();

    let p = when(cm, "updatefavorites");
    cm.refreshUserFavorites(1);
    let id = yield p;
    assert.equal(id, 1);
};

require("sdk/test").run(exports);
