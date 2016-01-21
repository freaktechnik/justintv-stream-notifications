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
const { before, after } = require("sdk/test/utils");
const self = require("sdk/self");
const { getMockAPIQS, IGNORE_QSUPDATE_PROVIDERS } = require("./providers/mock-qs");

const TESTUSER = {
    name: "freaktechnik",
    type: "twitch"
};

var SHARED = {};

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

    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    let res;
    for(let p in providers) {
        console.log(p);
        if(p == TESTUSER.type) {
            res = yield cc.autoAddUsers(p);
            console.log(res[0]);
            assert.ok(res.length > 0, "Found credential for "+p);
        }
        else if(providers[p].supports.credentials) {
            if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
                res = yield cc.autoAddUsers(p);
                assert.equal(res.length, 0, "found no credentials for "+p);
            }
        }
        else {
            yield expectReject(cc.autoAddUsers(p));
        }
    }

    console.log("clear");
    yield when(cc, "channelupdated");
    console.log("updt");
    let users = yield cc.getUsersByType();
    console.log("gotusrs");
    for(let u of users)
        yield cc.removeUser(u.id, true);

    res = yield cc.autoAddUsers();
    assert.ok(res.some((r) => r.length > 0), "All credentials finds some");

    users = yield cc.getUsersByType();
    for(let u of users)
        yield cc.removeUser(u.id, true);

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
    const cc = new ChannelController();

    yield expectReject(cc.addUser("test", "test"));

    cc.destroy();
};

exports.testUserMethods = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    const user = yield cc.addUser(TESTUSER.name, TESTUSER.type);

    assert.equal(user.login, TESTUSER.name, "Added user has correct login");
    assert.equal(user.type, TESTUSER.type, "Added user has correct type");
    assert.ok("id" in user, "Added user has an ID");

    let channels = yield cc.getChannelsByType();
    assert.equal(channels.length, 1, "All followed channels were added");

    yield expectReject(cc.addUser(TESTUSER.name, TESTUSER.type, () => true));

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
    channels = yield cc.getChannelsByType();
    assert.equal(channels.length, 0, "All channels were removed");

    cc.destroy();
};

exports.testQueue = function*(assert) {
    const cc = new ChannelController();
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
    const cc = new ChannelController();

    cc.showManager();

    yield when(tabs, "ready");

    assert.equal(tabs.activeTab, cc._manager.managerTab, "Manager tab was opened.");

    tabs.open({url: self.data.url("list.html") });
    yield when(tabs, "ready");
    const tab = tabs.activeTab;

    cc.showManager();
    yield when(tabs, "activate");
    assert.equal(cc._manager.managerTab, tabs.activeTab);

    tab.close();
    cc._manager.managerTab.close();

    cc.destroy();
};

before(exports, () => {
    const provider = providers[TESTUSER.type];
    SHARED.oldQS = provider._qs;

    provider._setQs(getMockAPIQS(SHARED.oldQS, TESTUSER.type));
});

after(exports, () => {
    providers[TESTUSER.type]._setQs(SHARED.oldQS);
});

require("sdk/test").run(exports);
