/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

"use strict";

var { ChannelList } = require('../lib/channellist'),
    { Channel, User } = require('../lib/channeluser');

var list;

exports['test channellist'] = function(assert, done) {
    console.log(assert);
    var tests = [
        function testInit(assert, next) {
            list = new ChannelList({
                onReady: function() {
                    assert.pass("Ready event fired");
                    next();
                }
            });
        },
        function testAddUser(assert, next) {
            list.once("useradded", function(user) {

                assert.ok(user instanceof User, "User is a user");
                assert.ok(user.id, "The user has an ID");
                assert.equal(user.uname, "lorem ipsum");
                next();
            });
            list.addUser(getUser());
        },
        function testGetUser(assert, next) {
            list.getUser(function(user) {
                assert.ok(user instanceof User, "The user is a user");
                assert.ok(user.id, "User has an ID");
                assert.equal(user.login, 'test');
                assert.equal(user.type, 'test');
                assert.equal(user.uname, 'lorem ipsum');
                list.getUser(function(sameUser) {
                    assert.ok(sameUser instanceof User);
                    assert.equal(user.id, sameUser.id);
                    next();
                }, user.id);
            }, 'test', 'test');
        },
        function testGetInexistentUser(assert, next) {
            list.getUser(function(user) {
                assert.ok(!user);
                next();
            }, 'doesnot', 'exist');
        },
        function testSetUser(assert, next) {
            var user = getUser();
            user.uname = 'foo bar';
            user.favorites.push("test_chan");
            list.once("userupdated", function(user) {
                assert.ok(user instanceof User);
                assert.equal(user.uname, 'foo bar');
                list.getUser(function(nuser) {
                    assert.ok(nuser instanceof User);
                    assert.equal(nuser.uname, user.uname);
                    next();
                }, user.id);
            });

            list.setUser(user);
        },
        function testGetUserId(assert, next) {
            list.getUser(function(user) {
                list.getUserId(user.login, user.type, function(userId) {
                    assert.equal(user.id, userId);
                    next();
                });
            }, 'test', 'test');
        },
        function testSetNewUser(assert, next) {
            var newUser = getUser();
            newUser.login = 'test2';
            newUser.id = 2;

            list.once("userupdated", function(user) {
                assert.ok(user instanceof User);
                assert.equal(user.login, newUser.login);
                next();
            });

            list.setUser(newUser);
        },
        function testGetUsersByType(assert, next) {
            list.getUsersByType("test", function(users) {
                assert.equal(users.length, 2);
                assert.ok(users[0] instanceof User);
                assert.equal(users[0].type, "test");
                assert.ok(users[1] instanceof User);
                assert.equal(users[1].type, "test");
                next();
            });
        },
        function testGetAllUsers(assert, next) {
            list.getUsersByType(null, function(users) {
                assert.equal(users.length, 2);
                users.forEach(function(user) {
                    assert.ok(user instanceof User);
                });
                next();
            });
        },
        function testGetUsersByFavorite(assert, next) {
            var chan = new Channel();
            chan.login = "test_chan";
            chan.type = "test";
            list.getUsersByFavorite(chan, function(users) {
                assert.equal(users.length, 1);
                assert.ok(users[0] instanceof User);
                assert.equal(users[0].favorites[0], "test_chan");
                next();
            });
        },
        function testAddChannel(assert, next) {
            list.once("channelsadded", function(channels) {
                assert.equal(channels.length, 1);
                assert.ok(channels[0] instanceof Channel, "Channel is a channel");
                assert.ok(channels[0].id, "The channel has an ID");
                assert.equal(channels[0].uname, "lorem ipsum");
                next();
            });
            list.addChannel(getChannel());
        },
        function testAddChannels(assert, next) {
            //TODO
            next();
        },
        function testGetChannel(assert, next) {
            list.getChannel(function(channel) {
                assert.ok(channel instanceof Channel, "The channel is a channel");
                assert.ok(channel.id, "Channel has an ID");
                assert.equal(channel.login, 'test_chan');
                assert.equal(channel.type, 'test');
                assert.equal(channel.uname, 'lorem ipsum');
                list.getChannel(function(sameChannel) {
                    assert.ok(sameChannel instanceof Channel);
                    assert.equal(channel.id, sameChannel.id);
                    next();
                }, channel.id);
            }, 'test_chan', 'test');
        },
        function testGetInexistentChannel(assert, next) {
            list.getChannel(function(channel) {
                assert.ok(!channel);
                next();
            }, 'doesnot', 'exist');
        },
        function testSetChannel(assert, next) {
            var channel = getChannel();
            channel.uname = 'foo bar';
            list.once("channelupdated", function(user) {
                assert.ok(channel instanceof Channel);
                assert.equal(channel.uname, 'foo bar');
                list.getChannel(function(sameChannel) {
                    assert.ok(sameChannel instanceof Channel);
                    assert.equal(sameChannel.uname, channel.uname);
                    next();
                }, channel.id);
            });

            list.setChannel(channel);
        },
        function testGetChannelId(assert, next) {
            list.getChannel(function(channel) {
                list.getChannelId(channel.login, channel.type, function(channelId) {
                    assert.equal(channel.id, channelId);
                    next();
                });
            }, 'test_chan', 'test');
        },
        function testChannelExists(assert, next) {
            list.channelExists(function(exists) {
                assert.ok(exists, "The test_Chan channel exists");
                list.channelExists(function(shouldntExist) {
                    assert.ok(!shouldntExist, "An inexistent channel isn't reported as existing");
                    next();
                }, 'doesnot', 'exist');
            }, 'test_chan', 'test');
        },
        function testLiveStatus1(assert, next) {
            list.liveStatus(null, function(liveStatus) {
                assert.ok(!liveStatus);
                list.liveStatus("exist", function(existsLiveStatus) {
                    assert.ok(!existsLiveStatus);
                    next();
                });
            });
        },
        function testSetNewChannel(assert, next) {
            var newChannel = getChannel();
            newChannel.login = 'test_chan2';
            newChannel.id = 2;
            newChannel.live = true;

            list.once("channelupdated", function(channel) {
                assert.ok(channel instanceof Channel);
                assert.equal(channel.login, newChannel.login);
                next();
            });

            list.setChannel(newChannel);
        },
        function testLiveStatus2(assert, next) {
            list.liveStatus(null, function(liveStatus) {
                assert.ok(liveStatus);
                list.liveStatus("exist", function(existsLiveStatus) {
                    assert.ok(!existsLiveStatus);
                    list.liveStatus("test", function(testsLiveStatus) {
                        assert.ok(testsLiveStatus);
                        next();
                    });
                });
            });
        },
        function testGetChannelsByType(assert, next) {
            list.getChannelsByType("test", function(channels) {
                assert.equal(channels.length, 2);
                assert.ok(channels[0] instanceof Channel);
                assert.equal(channels[0].type, "test");
                assert.ok(channels[1] instanceof Channel);
                assert.equal(channels[1].type, "test");
                next();
            });
        },
        function testGetAllChannels(assert, next) {
            list.getChannelsByType(null, function(channels) {
                assert.equal(channels.length, 2);
                channels.forEach(function(channel) {
                    assert.ok(channel instanceof Channel);
                });
                next();
            });
        },
        function testRemoveUsersByFavorite(assert, next) {
            list.getChannel(function(channel) {
                list.once("userdeleted", function(user) {
                    assert.equal(user.id, 1, "User has been deleted");
                    next();
                });
                list.removeUsersWithFavorite(channel.id);
            }, 'test_chan', 'test');
        },
        function testRemoveChannel(assert, next) {
            list.getChannelId('test_chan2', 'test', function(id) {
                list.once("channeldeleted", function(channel) {
                    assert.equal(id, channel.id);
                    next();
                });
                list.removeChannel(id);
            });
        },
        function testRemoveUser(assert, next) {
            list.getUserId('test2', 'test', function(id) {
                list.once("userdeleted", function(user) {
                    assert.equal(id, user.id);
                    next();
                });
                list.removeUser(id);
            });
        },
        function testsDone() {
            done();
        }
    ];
    for(var i = tests.length - 2; i >= 0; --i) {
        tests[i] = tests[i].bind(this, assert, tests[i+1]);
    }
    tests[0]();
};

function getUser() {
    var user = new User();
    user.type = "test";
    user.uname='lorem ipsum';
    user.login='test';
    user.image={'20':'http://example.com/0.jpg','40':'http://example.com/1.jpg'};
    return user;
}

function getChannel() {
    var channel = new Channel();
    channel.type = "test";
    channel.url.push('http://foo.bar/lorem');
    channel.archiveUrl = 'http://foo.bar/lorem/archive';
    channel.uname='lorem ipsum';
    channel.login='test_chan';
    channel.logo={'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return channel;
}

require("sdk/test").run(exports);

