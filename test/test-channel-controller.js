/**
 * Test channel controller.
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test parental controls
 * @todo properly test events and stuff.
 */
"use strict";

const requireHelper = require("./require_helper");
const ChannelController = requireHelper("../lib/channel/controller").default;
const passwords = require("sdk/passwords");
const providers = requireHelper("../lib/providers").default;
const { defer } = require("sdk/core/promise");
const tabs = require("sdk/tabs");
const { when } = require("sdk/event/utils");
const { expectReject } = require("./event/helpers");
const { before, after } = require("sdk/test/utils");
const self = require("sdk/self");
const { getMockAPIQS, IGNORE_QSUPDATE_PROVIDERS } = require("./providers/mock-qs");
const clipboard = require("sdk/clipboard");
const { prefs } = require("sdk/simple-prefs");

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
        if(p == TESTUSER.type) {
            res = yield cc.autoAddUsers(p);
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
    yield cc._ensureQueueReady();

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

exports.testRemoveUser = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    const user = yield cc.addUser(TESTUSER.name, TESTUSER.type);

    yield cc.removeUser(user.id);

    const users = yield cc.getUsersByType();
    assert.equal(users.length, 0, "User has been removed");

    yield cc.getChannelsByType().then((channels) => Promise.all(channels.map((c) => cc.removeChannel(c.id))));

    cc.destroy();
};

exports.testAddChannel = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    yield expectReject(cc.addChannel("test", "test"));

    cc.destroy();
};

exports.testCancelAddChannel = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    yield expectReject(cc.addChannel(TESTUSER.name, TESTUSER.type, () => true));

    const channel = yield cc.addChannel(TESTUSER.name, TESTUSER.type, () => false);
    assert.equal(channel.login, TESTUSER.name);
    assert.equal(channel.type, TESTUSER.type);
    assert.ok("id" in channel);

    yield cc.removeChannel(channel.id);

    cc.destroy();
};


exports.testChannelMethods = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    let channel = yield cc.addChannel(TESTUSER.name, TESTUSER.type);

    assert.equal(channel.login, TESTUSER.name, "Added channel has correct login");
    assert.equal(channel.type, TESTUSER.type, "Added channel has correct type");
    assert.ok("id" in channel, "Added channel has an ID");

    const secondChannel = yield cc.getChannel(channel.id);
    assert.equal(secondChannel.login, channel.login, "Getting the channel returns one with the same login");
    assert.equal(secondChannel.type, channel.type, "Getting the channel returns one with the same type");
    assert.equal(secondChannel.id, channel.id, "Getting the channel returns one with the same id even");

    let channels = yield cc.getChannelsByType();
    assert.equal(channels.length, 1, "Getting all channels returns exactly one");
    assert.equal(channels[0].login, TESTUSER.name, "Found channel has correct login");
    assert.equal(channels[0].type, TESTUSER.type, "Found channel has correct type");
    assert.equal(channels[0].id, channel.id, "FOund channel has correct id");

    channels = yield cc.getChannelsByType(TESTUSER.type);
    assert.equal(channels.length, 1, "Getting channels by type holds one result.");
    assert.equal(channels[0].login, TESTUSER.name, "Found channel has correct login");
    assert.equal(channels[0].type, TESTUSER.type, "Found channel has correct type");
    assert.equal(channels[0].id, channel.id, "Found channel has correct ID");

    channels = yield cc.updateChannels(TESTUSER.type);
    assert.equal(channels.length, 1, "One channel was updated when updating just the channels of the type");
    assert.equal(channels[0].login, TESTUSER.name, "Updated channel has the correct login");
    assert.equal(channels[0].type, TESTUSER.type, "Updated channel has correct type");
    assert.equal(channels[0].id, channel.id, "Updated channel has correct ID");

    channels = yield cc.updateChannels();
    assert.equal(channels.length, Object.keys(providers).filter((p) => providers[p].enabled).length, "There is an item per provider");
    channels.forEach((chans) => assert.ok(Array.isArray(chans), "Each of the items is an array"));

    // Flatten the arrays, so we have all the channels in one array.
    channels = [].concat(...channels);
    assert.equal(channels.length, 1, "Updating all channels updated one channel");
    assert.equal(channels[0].login, TESTUSER.name, "Updated channel has the correct login");
    assert.equal(channels[0].type, TESTUSER.type, "Updated channel has the correct type");
    assert.equal(channels[0].id, channel.id, "Updated channel has correct ID");

    channel = yield cc.updateChannel(channel.id);
    assert.equal(channel.login, TESTUSER.name, "Updated channel has the correct login");
    assert.equal(channel.type, TESTUSER.type, "Updated channel has the correct type");
    assert.equal(channel.id, secondChannel.id, "Updated channel has the same ID");

    yield cc.removeChannel(channel.id);

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

exports.testDisabledProvider = function*(assert) {
    let p = Object.keys(providers).find((pr) => !providers[pr].enabled);

    if(p) {
        const cc = new ChannelController();
        yield cc._ensureQueueReady();

        yield expectReject(cc.addChannel(TESTUSER.name, p));

        //TODO place a channel in the channel list so we can test this
        //const r = yield cc.updateChannel(channel.id);
        //assert.strictEqual(r, null);

        const channels = yield cc.updateChannels(p);
        assert.equal(channels.length, 0, "No channels were updated");

        //TODO make sure removeChannel doesn't throw
        //yield cc.removeChannel(channel.id);

        yield expectReject(cc.addUser(TESTUSER.name, p));

        //TODO also test user functions.

        cc.destroy();
    }
    else {
        assert.pass("No disabled provider found");
        //TODO have a plan b here.
    }
};

exports.testCopyLocalChannelToClipboard = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    const referenceChannel = yield cc.addChannel(TESTUSER.name, TESTUSER.type);

    const prevClipboard = clipboard.get();

    clipboard.set("foobar", "text");

    const channel = yield cc.copyChannelURL(referenceChannel.id);
    assert.equal(channel.id, referenceChannel.id, "Channel returned is the same as the one we requested to copy the URL for");
    assert.equal(channel.url[0], clipboard.get(), "Copied URL matches the channel's URL");

    clipboard.set("foobar", "text");

    const prevPattern = prefs.copy_pattern;
    prefs.copy_pattern = "Test {URL} foo bar";
    const expectedString = prefs.copy_pattern.replace("{URL}", channel.url[0]);
    yield cc.copyChannelURL(channel.id);
    assert.equal(expectedString, clipboard.get(), "Copied string matches waht we'd expect based on the pref");
    prefs.copy_pattern = prevPattern;

    //TODO test alternativeURL

    clipboard.set(prevClipboard);
    cc.destroy();
};

exports.testCopyExternalChannelToClipboard = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    const prevClipboard = clipboard.get();
    clipboard.set("foobar", "text");

    const channel = yield cc.copyChannelURL(TESTUSER.name, TESTUSER.type);
    assert.equal(channel.type, TESTUSER.type, "Channel type matches the type we gave");
    assert.equal(channel.login, TESTUSER.name, "Channel login matches the given login");
    assert.equal(channel.url[0], clipboard.get(), "Copied URL matches the channel's URL");

    clipboard.set(prevClipboard);

    cc.destroy();
};

exports.testCopyInvalidChannelToClipboard = function*(assert) {
    const cc = new ChannelController();
    yield cc._ensureQueueReady();

    yield expectReject(cc.copyChannelURL(TESTUSER.name, "foobar"));

    cc.destroy();
};

before(exports, () => {
    const provider = providers[TESTUSER.type];
    SHARED.oldQS = provider._qs;

    provider._setQs(getMockAPIQS(SHARED.oldQS, TESTUSER.type, false));
});

after(exports, () => {
    providers[TESTUSER.type]._setQs(SHARED.oldQS);
});

require("sdk/test").run(exports);
