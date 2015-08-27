/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

var { ChannelList } = require('../lib/channellist'),
    { User } = require('../lib/channeluser');

let { Channel, getUser, getChannel } = require("./channeluser/utils");
let { wait, expectReject } = require("./event/helpers");

exports['test channellist'] = function*(assert) {
    let list = new ChannelList();
    yield wait(list, "ready");

    assert.pass("Ready event fired");

    // Test addUser
    console.info("channelList.addUser");

    let user = yield list.addUser(getUser());

    assert.ok(user instanceof User, "User is a user");
    assert.ok(user.id, "The user has an ID");
    assert.equal(user.uname, "lorem ipsum");

    // Test getUser
    console.info("channelList.getUser");

    user = yield list.getUser('test', 'test');
    assert.ok(user instanceof User, "The user is a user");
    assert.ok(user.id, "User has an ID");
    assert.equal(user.login, 'test');
    assert.equal(user.type, 'test');
    assert.equal(user.uname, 'lorem ipsum');

    let sameUser = yield list.getUser(user.id);
    assert.ok(sameUser instanceof User, "The same user is a user");
    assert.equal(user.id, sameUser.id, "The same user has the same ID");

    // Test get nonexistent User
    console.info("get nonexistent User");

    yield expectReject(list.getUser('doesnot', 'exist'));

    // Test setUser
    console.info("channelList.setUser");

    user = getUser();
    user.uname = 'foo bar';
    user.favorites.push("test_chan");

    user = yield list.setUser(user);

    assert.ok(user instanceof User);
    assert.equal(user.uname, 'foo bar');

    let nuser = yield list.getUser(user.id);
    assert.ok(nuser instanceof User);
    assert.equal(nuser.uname, user.uname);

    user = yield list.getUser('test', 'test');
    let userId = yield list.getUserId(user.login, user.type);
    assert.equal(user.id, userId);

    // Test set new user
    console.info("set new user");

    var newUser = getUser();
    newUser.login = 'test2';
    newUser.id = 2;

    user = yield list.setUser(newUser);

    assert.ok(user instanceof User);
    assert.equal(user.login, newUser.login);

    // Test getUsersByType
    console.info("channelList.getUsersByType");

    let users = yield list.getUsersByType("test");
    assert.equal(users.length, 2);
    assert.ok(users[0] instanceof User);
    assert.equal(users[0].type, "test");
    assert.ok(users[1] instanceof User);
    assert.equal(users[1].type, "test");

    // Test getAllUsers aka getUsersByType(null)
    console.info("channelList.getAllUsers");

    users = yield list.getUsersByType(null);
    assert.equal(users.length, 2);
    users.forEach(function(user) {
        assert.ok(user instanceof User);
    });

    // Test getUsersByFavorite
    console.info("channelList.getUsersByFavorite");

    let chan = new Channel();
    chan.login = "test_chan";
    chan.type = "test";
    users = yield list.getUsersByFavorite(chan);
    assert.equal(users.length, 1, "Correct amont of users with test_chan as favorite");
    assert.ok(users[0] instanceof User, "Returned user is a User");
    assert.equal(users[0].favorites[0], "test_chan", "User has test_chan as favorite");

    // Test addChannel
    console.info("channelList.addChannel");

    chan = getChannel();
    chan.login = "test_chan";
    let channel = yield list.addChannel(chan);

    assert.ok(channel instanceof Channel, "Channel is a channel");
    assert.ok(channel.id, "The channel has an ID");
    assert.equal(channel.uname, "lorem ipsum");

    // Test addChannels with a single channel
    console.info("channelList.getChannels with a single channel");

    chan = getChannel();
    let channels = yield list.addChannels(chan);

    assert.equal(channels.length, 1);
    assert.ok(channels[0] instanceof Channel, "Channel is a channel");
    assert.ok(channels[0].id, "The channel has an ID");
    assert.equal(channels[0].uname, "lorem ipsum");
    yield list.removeChannel(channels[0].id);

    //TODO test addChannels
    console.info("channelList.getChannels");

    // Test getChannel
    console.info("channelList.getChannel");

    channel = yield list.getChannel('test_chan', 'test');
    assert.ok(channel instanceof Channel, "The channel is a channel");
    assert.ok(channel.id, "Channel has an ID");
    assert.equal(channel.login, 'test_chan');
    assert.equal(channel.type, 'test');
    assert.equal(channel.uname, 'lorem ipsum');

    let sameChannel = yield list.getChannel(channel.id);
    assert.ok(sameChannel instanceof Channel);
    assert.equal(channel.id, sameChannel.id);

    // Test get inexistent channel
    console.info("get inexistent channel");

    yield expectReject(list.getChannel('doesnot', 'exist'));

    // test setChannel
    console.info("channelList.setChannel");

    channel = getChannel();
    channel.uname = 'foo bar';
    channel.login = 'test_chan';
    channel = yield list.setChannel(channel);

    assert.ok(channel instanceof Channel);
    assert.equal(channel.uname, 'foo bar');

    sameChannel = yield list.getChannel(channel.id);
    assert.ok(sameChannel instanceof Channel);
    assert.equal(sameChannel.uname, channel.uname);

    // Test getChannelId
    console.info("channelList.getChannelId");

    channel = yield list.getChannel('test_chan', 'test');
    let channelId = yield list.getChannelId(channel.login, channel.type);
    assert.equal(channel.id, channelId);

    // Test channelExists
    console.info("channelList.channelExists");

    let exists = yield list.channelExists('test_chan', 'test');
    assert.ok(exists, "The test_chan channel exists");

    let doesntexist = yield list.channelExists('doesnot', 'exist');
    assert.ok(!doesntexist, "The doesnto channel doesn't exist");

    // Test liveStatus 1
    console.info("channelList.liveStatus 1");

    let liveStatus = yield list.liveStatus(null);
    assert.ok(!liveStatus);

    liveStatus = yield list.liveStatus("exist");
    assert.ok(!liveStatus);

    // Test set new channel
    console.info("set new channel");

    var newChannel = getChannel();
    newChannel.login = 'test_chan2';
    newChannel.id = 3;
    newChannel.live = true;

    channel = yield list.setChannel(newChannel);
    assert.ok(channel instanceof Channel);
    assert.equal(channel.login, newChannel.login);

    // Test liveStatus 2
    console.info("channelList.liveStatus 2");

    liveStatus = yield list.liveStatus(null);
    assert.ok(liveStatus);

    liveStatus = yield list.liveStatus("exist");
    assert.ok(!liveStatus);

    liveStatus = yield list.liveStatus("test");
    assert.ok(liveStatus);

    // Test getChannelsByType
    console.info("channelList.getChannelsByType");

    channels = yield list.getChannelsByType("test");
    assert.equal(channels.length, 2);
    assert.ok(channels[0] instanceof Channel);
    assert.equal(channels[0].type, "test");
    assert.ok(channels[1] instanceof Channel);
    assert.equal(channels[1].type, "test");

    // Test getAllChannels aka getChannelsByType(null, ...args)
    console.info("channelList.getAllChannels");

    channels = yield list.getChannelsByType(null);
    assert.equal(channels.length, 2);
    channels.forEach(function(channel) {
        console.log(channel.login);
        assert.ok(channel instanceof Channel);
    });


    // Test getChannelsByUserFavorites
    console.info("channelList.getChannelsByUserFavorites");

    let { login: userName, type: userType } = getUser();
    user = yield list.getUser(userName, userType);
    channels = yield list.getChannelsByUserFavorites(user);
    assert.equal(channels.length, 1);
    assert.equal(channels[0].login, user.favorites[0]);

    // Test removeUsersWithFavorite
    console.info("channelList.removeUsersWithFavorite");

    channel = yield list.getChannel('test_chan', 'test');
    users = yield list.removeUsersWithFavorite(channel.id);

    assert.equal(users.length, 1);
    assert.equal(users[0].id, 1, "User has been deleted");

    // Test removeChannel
    console.info("channelList.removeChannel");

    let id = yield list.getChannelId('test_chan2', 'test');
    channel = yield list.removeChannel(id);

    assert.equal(id, channel.id);

    // Test removeUser
    console.info("channelList.removeUser");

    id = yield list.getUserId('test2', 'test');
    user = yield list.removeUser(id);

    assert.equal(id, user.id);
};

require("sdk/test").run(exports);

