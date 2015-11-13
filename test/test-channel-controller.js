/**
 * Test channel controller.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { ChannelController } = requireHelper("../lib/channel/controller");
const passwords = require("sdk/passwords");
const providers = requireHelper("../lib/providers");
const { defer } = require("sdk/core/promise");
const tabs = require("sdk/tabs");
const { when } = require("sdk/event/utils");
const { expectReject } = require("./event/helpers");

const TESTUSER = {
    name: "freaktechnik",
    type: "twitch"
};

exports.testCredentials = function*(assert) {
    let { promise, resolve, reject } = defer();
    passwords.store({
        url: providers[TESTUSER.type].authURL[0],
        formSubmitURL: providers[TESTUSER.type].authURL[0] + "/submit",
        username: TESTUSER.name,
        password: "test",
        onComplete: resolve,
        onError: reject
    });

    yield promise;

    let cc = new ChannelController();
    yield cc._ensureQueueReady();

    let res;

    for(let p in providers) {
        if(p == TESTUSER.type) {
            res = yield cc.autoAddUsers(p);
            console.log(res[0]);
            assert.ok(res.length > 0, "Found credential for "+p);
        }
        else if(providers[p].supports.credentials) {
            res = yield cc.autoAddUsers(p);
            assert.equal(res.length, 0, "found no credentials for "+p);
        }
        else {
            yield expectReject(cc.autoAddUsers(p));
        }
    }

    yield cc._list.clear();

    res = yield cc.autoAddUsers();
    assert.ok(res.some((r) => r.length > 0), "All credentials finds some");

    yield cc._list.clear();
    cc.destroy();
    /*let p = defer();
    passwords.remove({
        formSubmitURL: providers[TESTUSER.type].authURL[0] + "/submit",
        username: TESTUSER.name,
        password: "test",
        onComplete: p.resolve,
        onError: p.reject
    });
    yield p.promise;*/
};

exports.testAddUser = function*(assert) {
    let cc = new ChannelController();

    yield expectReject(cc.addUser("test", "test"));
    
    cc.destroy();
};

exports.testUserMethods = function*(assert) {
    let cc = new ChannelController();
    yield cc._ensureQueueReady();

    let user = yield cc.addUser(TESTUSER.name, TESTUSER.type);

    assert.equal(user.login, TESTUSER.name, "Added user has correct login");
    assert.equal(user.type, TESTUSER.type, "Added user has correct type");
    assert.ok("id" in user, "Added user has an ID");

    let users = yield cc.getUsersByType(TESTUSER.type);
    assert.equal(users.length, 1, "Get users by type for the user's type holds one result");
    assert.equal(users[0].login, TESTUSER.name, "Found user has correct login");
    assert.equal(users[0].type, TESTUSER.type, "Found user has correct type");
    assert.equal(users[0].id, user.id, "Found user has correct ID");

    users = yield cc.getUsersByType();
    assert.equal(users.length, 1, "Getting all users holds one result");
    assert.equal(users[0].login, TESTUSER.name, "Found user has correct login");
    assert.equal(users[0].type, TESTUSER.type, "Found user has correct type");
    assert.equal(users[0].id, user.id, "Found user has correct ID");

    users = yield cc.updateUser(user.id);
    assert.equal(users.length, 1, "One user was updated when updating just the user");
    assert.equal(users[0].login, TESTUSER.name, "Updated user has the correct login");
    assert.equal(users[0].type, TESTUSER.type, "Updated user has correct type");
    assert.equal(users[0].id, user.id, "Updated user has correct ID");

    users = yield cc.updateUser();
    assert.equal(users.length, 1, "Updating all users updated one user");
    assert.equal(users[0].login, TESTUSER.name, "Updated user has the correct login");
    assert.equal(users[0].type, TESTUSER.type, "Updated user has the correct type");
    assert.equal(users[0].id, user.id, "Updated user has correct ID");

    yield cc.removeUser(user.id, true);

    users = yield cc.getUsersByType();
    assert.equal(users.length, 0, "All users were removed");
    let channels = yield cc.getChannelsByType();
    assert.equal(channels.length, 0, "All channels were removed");

    yield cc._list.clear();
    cc.destroy();
};

exports.testQueue = function*(assert) {
    let cc = new ChannelController();
    cc._list.off();

    // Reset queue stuff
    cc._queue.length = 0;
    cc._ready = false;

    cc._ensureQueueReady();
    assert.equal(cc._queue.length, 1);

    cc._ready = true;
    yield cc._ensureQueueReady();
    assert.equal(cc._queue.length, 1);

    cc.destroy();
};

exports.testOpenManager = function*(assert) {
    let cc = new ChannelController();

    cc.showManager();

    yield when(tabs, "ready");

    assert.equal(tabs.activeTab, cc._manager.managerTab, "Manager tab was opened.");

    tabs.open({url: "https://example.com" });
    yield when(tabs, "ready");
    let tab = tabs.activeTab;

    cc.showManager();
    yield when(tabs, "activate");
    assert.equal(cc._manager.managerTab, tabs.activeTab);

    tab.close();
    cc._manager.managerTab.close();

    cc.destroy();
};

require("sdk/test").run(exports);
