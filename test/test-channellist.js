/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test events other than ready
 */

"use strict";

const requireHelper = require("./require_helper");
var { ChannelList } = requireHelper('../lib/channel/list'),
    { User } = requireHelper('../lib/channel/core');
const { before, after } = require("sdk/test/utils");
const { prefs} = require("sdk/simple-prefs");

let { Channel, getUser, getChannel } = require("./channeluser/utils");
let { wait, expectReject } = require("./event/helpers");

let SHARED = {};

exports['test channellist get invalid users'] = function*(assert) {
    yield expectReject(SHARED.list.getUser());
    yield expectReject(SHARED.list.getUser(-1));
    yield expectReject(SHARED.list.getUser('doesnot', 'exist'));
};

exports['test channellist add-remove user'] = function*(assert) {
    const referenceUser = getUser();
    let user = yield SHARED.list.addUser(referenceUser);

    assert.ok(user instanceof User, "User is a user");
    assert.ok(user.id, "The user has an ID");
    assert.equal(user.uname, referenceUser.uname);

    yield expectReject(SHARED.list.addUser(referenceUser));

    user = getUser();
    user.uname = 'foo bar';
    user.favorites.push("test_chan");

    user = yield SHARED.list.setUser(user);

    assert.ok(user instanceof User);
    assert.equal(user.uname, 'foo bar');

    let nuser = yield SHARED.list.removeUser(user.id);

    assert.ok(nuser instanceof User);
    assert.equal(nuser.id, user.id);

    yield expectReject(SHARED.list.getUser(user.id));
};

exports['test get user by login and type'] = function*(assert) {
    let referenceUser = yield SHARED.list.addUser(getUser());

    let user = yield SHARED.list.getUser('test', 'test');
    assert.ok(user instanceof User, "The user is a user");
    assert.ok(user.id, "User has an ID");
    assert.equal(user.login, referenceUser.login);
    assert.equal(user.type, referenceUser.type);
    assert.equal(user.uname, referenceUser.uname);
};

exports['test get user by id'] = function*(assert) {
    let referenceUser = yield SHARED.list.addUser(getUser());

    let user = yield SHARED.list.getUser(referenceUser.id);
    assert.ok(user instanceof User, "The same user is a user");
    assert.equal(user.id, referenceUser.id, "The same user has the same ID");
};

exports['test set new user'] = function*(assert) {
    var newUser = getUser();
    newUser.login = 'test2';
    newUser.id = 2;

    let user = yield SHARED.list.setUser(newUser);

    assert.ok(user instanceof User);
    assert.equal(user.login, newUser.login);
    assert.equal(user.id, newUser.id);
};

exports['test get user id'] = function*(assert) {
    let user = yield SHARED.list.addUser(getUser());

    let userId = yield SHARED.list.getUserId(user.login, user.type);
    assert.equal(user.id, userId);
};

exports['test get users by type'] = function*(assert) {
    let user1 = yield SHARED.list.addUser(getUser());

    let user2 = getUser();
    user2.login = "test2";
    user2 = yield SHARED.list.addUser(user2);

    let users = yield SHARED.list.getUsersByType(user1.type);
    assert.equal(users.length, 2);
    users.forEach((user) => {
        assert.ok(user instanceof User);
        assert.equal(user.type, "test");
    });
};

exports['test get all users'] = function*(assert) {
    let user1 = yield SHARED.list.addUser(getUser());

    let user2 = yield SHARED.list.addUser(getUser("test2", "lorem"));

    let users = yield SHARED.list.getUsersByType();
    assert.equal(users.length, 2 + SHARED.extraUsers);
    users.forEach((user) => {
        assert.ok(user instanceof User);
    });
};

exports['test get users by favorite'] = function*(assert) {
    let chan = getChannel("test_chan", "test");

    let user = getUser();
    user.favorites = [ chan.login ];
    yield SHARED.list.addUser(user);

    let users = yield SHARED.list.getUsersByFavorite(chan);
    assert.equal(users.length, 1, "Correct amont of users with test_chan as favorite");
    assert.ok(users[0] instanceof User, "Returned user is a User");
    assert.equal(users[0].favorites[0], chan.login, "User has test_chan as favorite");
};

exports['test add channel'] = function*(assert) {
    let referenceChannel = getChannel();
    let channel = yield SHARED.list.addChannel(referenceChannel);

    assert.ok(channel instanceof Channel, "Channel is a channel");
    assert.ok(channel.id, "The channel has an ID");
    assert.equal(channel.uname, referenceChannel.uname);
    assert.equal(channel.type, referenceChannel.type);
    assert.equal(channel.login, referenceChannel.login);

    yield expectReject(SHARED.list.addChannel(referenceChannel));
};

exports['test remove channel by id'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());

    let removedChannel = yield SHARED.list.removeChannel(channel.id);

    assert.equal(removedChannel.id, channel.id, "Removed channel matches the channel to be removed");

    let exists = yield SHARED.list.channelExists(channel.id);
    assert.ok(!exists, "Channel was removed");
};

exports['test remove channel by login and type'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());

    let removedChannel = yield SHARED.list.removeChannel(channel.login, channel.type);

    assert.equal(removedChannel.id, channel.id, "Removed channel matches the channel to be removed");

    let exists = yield SHARED.list.channelExists(channel.id);
    assert.ok(!exists, "Channel was removed");
};

exports['test clear channellist'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());
    let user = yield SHARED.list.addUser(getUser());

    yield SHARED.list.clear();

    let chans = yield SHARED.list.getChannelsByType();
    assert.equal(chans.length, 0);

    let users = yield SHARED.list.getUsersByType();
    assert.equal(users.length, 0);
};

exports['test clear without db'] = function*(assert) {
    // emulate DB never initialized
    SHARED.list.db.close();
    delete SHARED.list.db;

    yield SHARED.list.clear();
    assert.notEqual(SHARED.list.db, null);

    let chans = yield SHARED.list.getChannelsByType();
    assert.equal(chans.length, 0);

    let users = yield SHARED.list.getUsersByType();
    assert.equal(users.length, 0);
};

exports['test add one channel with addchannels'] = function*(assert) {
    let chan = getChannel();
    let channels = yield SHARED.list.addChannels(chan);

    assert.equal(channels.length, 1);
    assert.ok(channels[0] instanceof Channel, "Channel is a channel");
    assert.ok(channels[0].id, "The channel has an ID");
    assert.equal(channels[0].uname, "lorem ipsum");
};

exports['test add one channel in an array with addchannels'] = function*(assert) {
    let chan = getChannel();
    let channels = yield SHARED.list.addChannels([chan]);

    assert.equal(channels.length, 1);
    assert.ok(channels[0] instanceof Channel, "Channel is a channel");
    assert.ok(channels[0].id, "The channel has an ID");
    assert.equal(channels[0].uname, "lorem ipsum");
};

exports['test add channels'] = function*(assert) {
    let chans = [getChannel(), getChannel("foo")];
    let channels = yield SHARED.list.addChannels(chans);

    assert.equal(channels.length, 2);
    channels.forEach((channel, i) => {
        assert.ok(channel instanceof Channel, "Channel is a channel");
        assert.ok(channel.id, "The channel has an ID");
        assert.equal(channel.uname, chans[i].uname);
    });
};

exports['test add existing channels'] = function*(assert) {
    let channels = [ getChannel(), getChannel("lorem") ];
    yield SHARED.list.addChannels(channels);
    channels = yield SHARED.list.addChannels(channels);
    assert.equal(channels.length, 0);
};

exports['test empty arguments for addchannels'] = function*(assert) {
    let channels = yield SHARED.list.addChannels([]);
    assert.equal(channels.length, 0);
    channels = yield SHARED.list.addChannels();
    assert.equal(channels.length, 0);
};

exports['test get channel'] = function*(assert) {
    let referenceChannel = yield SHARED.list.addChannel(getChannel());

    let channel = yield SHARED.list.getChannel(referenceChannel.login, referenceChannel.type);
    assert.ok(channel instanceof Channel, "The channel is a channel");
    assert.equal(channel.id, referenceChannel.id, "Channel has an ID");
    assert.equal(channel.login, referenceChannel.login);
    assert.equal(channel.type, referenceChannel.type);
    assert.equal(channel.uname, referenceChannel.uname);
};

exports['test get channel by id'] = function*(assert) {
    let referenceChannel = yield SHARED.list.addChannel(getChannel());

    let channel = yield SHARED.list.getChannel(referenceChannel.id);
    assert.ok(channel instanceof Channel);
    assert.equal(referenceChannel.id, channel.id);
};

exports['test get invalid channel'] = function*(assert) {
    yield expectReject(SHARED.list.getChannel());
    yield expectReject(SHARED.list.getChannel(-1));
    yield expectReject(SHARED.list.getChannel('doesnot', 'exist'));
};

exports['test set channel'] = function*(assert) {
    let referenceChannel = yield SHARED.list.addChannel(getChannel());
    referenceChannel.uname = 'foo bar';
    let channel = yield SHARED.list.setChannel(referenceChannel);

    assert.ok(channel instanceof Channel);
    assert.equal(channel.id, referenceChannel.id);
    assert.equal(channel.uname, referenceChannel.uname);
};

exports['test set channel without id'] = function*(assert) {
    let referenceChannel = getChannel();
    let storedChannel = yield SHARED.list.addChannel(referenceChannel);
    let id = storedChannel.id;
    referenceChannel.uname = 'foo bar';
    delete referenceChannel.id;
    let channel = yield SHARED.list.setChannel(referenceChannel);

    assert.ok(channel instanceof Channel);
    assert.equal(id, channel.id);
    assert.equal(channel.uname, referenceChannel.uname);
};

exports['test set new channel'] = function*(assert) {
    let referenceChannel = getChannel();
    referenceChannel.id = 0;
    let channel = yield SHARED.list.setChannel(referenceChannel);
    assert.ok(channel instanceof Channel);
    assert.equal(referenceChannel.login, channel.login);
    assert.equal(referenceChannel.type, channel.type);
};

exports['test get channel id'] = function*(assert) {
    let referenceChannel = yield SHARED.list.addChannel(getChannel());

    let channelId = yield SHARED.list.getChannelId(referenceChannel.login, referenceChannel.type);
    assert.equal(referenceChannel.id, channelId);
};

exports['test channel exists'] = function*(assert) {
    let referenceChannel = yield SHARED.list.addChannel(getChannel());

    let exists = yield SHARED.list.channelExists(referenceChannel.login, referenceChannel.type);
    assert.ok(exists, "The test_chan channel exists");

    exists = yield SHARED.list.channelExists(referenceChannel.id);
    assert.ok(exists, "The reference channel also exists when checked by id");

    let doesntexist = yield SHARED.list.channelExists('doesnot', 'exist');
    assert.ok(!doesntexist, "The doesnot channel doesn't exist");
};

exports['test user exists'] = function*(assert) {
    let referenceUser = yield SHARED.list.addUser(getUser());

    let exists = yield SHARED.list.userExists(referenceUser.login, referenceUser.type);
    assert.ok(exists, "The test user exists");

    exists = yield SHARED.list.userExists(referenceUser.id);
    assert.ok(exists, "The reference user also exists when checked by id");

    let doesntexist = yield SHARED.list.userExists('doesnot', 'exist');
    assert.ok(!doesntexist, "The doesnot user doesn't exist");
};

exports['test live status offline'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());

    let liveStatus = yield SHARED.list.liveStatus(null);
    assert.ok(!liveStatus);

    liveStatus = yield SHARED.list.liveStatus(channel.type);
    assert.ok(!liveStatus);

    liveStatus = yield SHARED.list.liveStatus("exist");
    assert.ok(!liveStatus);
};

exports['test live status live'] = function*(assert) {
    let channel = getChannel();
    channel.live = true;
    yield SHARED.list.addChannel(channel);

    let liveStatus = yield SHARED.list.liveStatus(null);
    assert.ok(liveStatus);

    liveStatus = yield SHARED.list.liveStatus(channel.type);
    assert.ok(liveStatus);

    liveStatus = yield SHARED.list.liveStatus("exist");
    assert.ok(!liveStatus);
};

exports['test get channels by type'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());
    yield SHARED.list.addChannel(getChannel("foo"));

    let channels = yield SHARED.list.getChannelsByType(channel.type);
    assert.equal(channels.length, 2);
    channels.forEach((channel) => {
        assert.ok(channel instanceof Channel);
        assert.equal(channel.type, "test");
    });
};

exports['test get all channels'] = function*(assert) {
    yield SHARED.list.addChannel(getChannel());
    yield SHARED.list.addChannel(getChannel("foo", "bar"));

    let channels = yield SHARED.list.getChannelsByType(null);
    assert.equal(channels.length, 2 + SHARED.extraChannels);
    channels.forEach(function(channel) {
        assert.ok(channel instanceof Channel);
    });
};

exports['test get channels by user favorites'] = function*(assert) {
    let channel = getChannel();
    yield SHARED.list.addChannel(channel);

    let referenceUser = getUser();
    referenceUser.favorites = [ channel.login ];
    yield SHARED.list.addUser(referenceUser);

    let channels = yield SHARED.list.getChannelsByUserFavorites(referenceUser);
    assert.equal(channels.length, 1);
    channels.forEach((channel) => {
        assert.ok(referenceUser.favorites.find((fav) => fav === channel.login) !== undefined);
    });
};

exports['test remove users with favorite'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());
    let user = getUser();
    user.favorites = [ channel.login ];
    user = yield SHARED.list.addUser(user);

    let users = yield SHARED.list.removeUsersWithFavorite(channel.id);
    assert.equal(users.length, 1);
    assert.equal(users[0].id, user.id, "User has been deleted");
};

exports['test remove channels by user favorites'] = function*(assert) {
    let channel = yield SHARED.list.addChannel(getChannel());
    let user = getUser();
    user.favorites = [ channel.login ];
    user = yield SHARED.list.addUser(user);

    let channels = yield SHARED.list.removeChannelsByUserFavorites(user.id);
    assert.equal(channels.length, 1);
    assert.equal(channels[0].id, channel.id);
};

exports['test channel offline setting'] = function(assert, done) {
    let channel = getChannel().serialize();
    channel.live = true;
    channel.lastModified = Date.now() - 2 * prefs.channellist_cacheTime;
    let transaction = SHARED.list.db.transaction("channels", "readwrite"),
        store       = transaction.objectStore("channels"),
        req         = store.add(channel);

    req.onsuccess = () => {
        SHARED.list.db.close();

        SHARED.list.openDB("channellist").then(() => {
            return SHARED.list.getChannel(channel.login, channel.type);
        }).then((channel) => {
            assert.ok(!channel.live);
        }).then(done);
    };
};

before(exports, (name, assert, done) => {
    let channels = [
        getChannel('foo', 'extra'),
        getChannel('bar', 'extra'),
        getChannel('lorem', 'extra'),
        getChannel('ipsum', 'extra')
    ];
    let users = [
        getUser('foo', 'extra'),
        getUser('bar', 'extra')
    ];
    SHARED.list = new ChannelList();
    SHARED.list.once("ready", () => {
        SHARED.list.addChannels(channels).then(() => {
            return Promise.all(users.map((u) => SHARED.list.addUser(u)));
        }).then(done);
    });
    SHARED.extraChannels = channels.length;
    SHARED.extraUsers = users.length;
});
after(exports, (name, assert, done) => {
    SHARED.list.clear().then(done, (e) => {
        assert.fail(e);
        done();
    });
});

require("sdk/test").run(exports);

