/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test serialize
 */

const requireHelper = require("./require_helper");
var { Channel, User, deserialize } = requireHelper('../lib/channel/core');
var { getUser, getChannel } = require("./channeluser/utils");

exports['test user base construction stuff'] = function(assert) {
    assert.ok(new User("test", "test") instanceof User, "New user object isn't instance of User");
    let userWithId = new User("test", "test", 1);
    assert.equal(userWithId.id, 1);
};

exports['test uname inheritance'] = function(assert) {
    let user = new User("test", "test");
    assert.equal(user.login, user.uname);

    let channel = new Channel("test", "test");
    assert.equal(channel.login, channel.uname);
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
    assert.ok(new Channel("test", "test") instanceof Channel);
    let channelWithId = new Channel("test", "test", 1);
    assert.equal(channelWithId.id, 1);
};

exports['test deserialize'] = function(assert) {
    let userProps = {
        id: 2,
        login: "test",
        type: "test",
        uname: "lorem",
        favorites: [ "test_chan" ]
    };

    let user = deserialize(userProps);

    Object.keys(userProps).forEach((key) => {
        if(Array.isArray(userProps[key])) {
            assert.equal(userProps[key].length, user[key].length);
        }
        else {
            assert.equal(userProps[key], user[key]);
        }
    });

    let channelProps = {
        id: 2,
        login: "test",
        type: "test",
        uname: "lorem",
        image: {
            20: "./asdf.png"
        },
        url: [ "https://example.com" ]
    };

    let channel = deserialize(channelProps);

    Object.keys(channelProps).forEach((key) => {
        if(Array.isArray(channelProps[key])) {
            assert.equal(channelProps[key].length, channel[key].length);
        }
        else if(typeof channelProps[key] === "object") {
            assert.ok(Object.keys(channelProps[key]).every((k) => channelProps[key][k] == channel[key][k]));
        }
        else {
            assert.equal(channelProps[key], channel[key]);
        }
    });
};

require("sdk/test").run(exports);

