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
                next();
            }, 'test', 'test');
        },
        function testSetUser(assert, next) {
            var user = getUser();
            user.uname = 'foo bar';
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
    user.image={'20':'http://foo.bar/0.jpg','40':'http://foo.bar/1.jpg'};
    return user;
}

require("sdk/test").run(exports);

