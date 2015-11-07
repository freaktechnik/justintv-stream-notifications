/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test serialize
 */

const requireHelper = require("./require_helper");
var { Channel, User } = requireHelper('../lib/channel/core');
var { getUser, getChannel } = require("./channeluser/utils");

exports['test user base construction stuff'] = function(assert) {
    assert.ok(new User() instanceof User, "New user object isn't instance of User");
    let userWithId = new User(1);
    assert.equal(userWithId.id, 1);
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
    assert.ok(new Channel() instanceof Channel);
    let channelWithId = new Channel(1);
    assert.equal(channelWithId.id, 1);
};

require("sdk/test").run(exports);

