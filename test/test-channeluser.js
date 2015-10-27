/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
var { Channel, User } = require('../lib/channeluser');
var { getUser, getChannel } = require("./channeluser/utils");

exports['test user base construction stuff'] = function(assert) {
    assert.ok(new User() instanceof User, "New user object isn't instance of User");
};

exports['test user toString'] = function(assert) {
    var user = getUser();
    assert.equal(user.toString(), 'Lorem ipsum');
    user.uname = 'Lorem ipsum';
    assert.equal(user.toString(), 'Lorem ipsum');
    user.uname = '7orem ipsum';
    assert.equal(user.toString(), '7orem ipsum');
    user.uname = 'LOREM§IPSUM';
    assert.equal(user.toString(), 'LOREM§IPSUM');
};

exports['test user image getter method'] = function(assert) {
    var user = getUser();
    assert.equal(user.getBestImageForSize(1), 'http://foo.bar/0.jpg');
    assert.equal(user.getBestImageForSize("20"), 'http://foo.bar/0.jpg');
    assert.equal(user.getBestImageForSize(20), 'http://foo.bar/0.jpg');
    assert.equal(user.getBestImageForSize(21), 'http://foo.bar/1.jpg', "21");
    assert.equal(user.getBestImageForSize(40), 'http://foo.bar/1.jpg', "40");
    assert.equal(user.getBestImageForSize(999), 'http://foo.bar/1.jpg', "999");
};

exports['test channel legacy'] = function(assert) {
    assert.ok(new Channel() instanceof User, "Channel doesn't inerhit from user");
    assert.ok(new Channel() instanceof Channel);
};


require("sdk/test").run(exports);

