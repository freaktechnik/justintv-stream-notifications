/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test serialize
 */
import test from "ava";
import { Channel, User } from '../../../src/background/channel/core';
import { getUser, getChannel } from "../../helpers/channel-user";
import LiveState from '../../../src/background/channel/live-state';

test('user base construction stuff', (t) => {
    t.true(new User("test", "test") instanceof User, "New user object isn't instance of User");
    const userWithId = new User("test", "test", 1);
    t.is(userWithId.id, 1);
});

test('uname inheritance', (t) => {
    const user = new User("test", "test");
    t.is(user.login, user.uname);

    const channel = new Channel("test", "test");
    t.is(channel.login, channel.uname);
});

test('user toString', (t) => {
    const user = getUser();
    t.is(user.toString(), 'Lorem ipsum');
    user.uname = 'Lorem ipsum';
    t.is(user.toString(), 'Lorem ipsum');
    user.uname = '7orem ipsum';
    t.is(user.toString(), '7orem ipsum');
    user.uname = 'LOREM§IPSUM';
    t.is(user.toString(), 'LOREM§IPSUM');
});

test('user image getter method', (t) => {
    const user = getUser();
    t.is(user.getBestImageForSize(1), user.image['48']);
    t.is(user.getBestImageForSize("18"), user.image['48']);
    t.is(user.getBestImageForSize(48), user.image['48']);
    t.is(user.getBestImageForSize(49), user.image['64'], "49");
    t.is(user.getBestImageForSize(50), user.image['64'], "50");
    t.is(user.getBestImageForSize(999), user.image['64'], "999");
});

test('channel legacy', (t) => {
    t.true(new Channel("test", "test") instanceof Channel);
    const channelWithId = new Channel("test", "test", 1);
    t.is(channelWithId.id, 1);
});

test('channel state serialization', (t) => {
    const channel = getChannel();
    t.true(channel.live instanceof LiveState);

    const serialized = channel.serialize();

    t.is(typeof serialized.live, "object");
    t.true(!(serialized.live instanceof LiveState));
});

test('deserialize', (t) => {
    const userProps = {
            id: 2,
            login: "test",
            type: "test",
            uname: "lorem",
            favorites: [ "test_chan" ]
        },
        user = User.deserialize(userProps);

    Object.keys(userProps).forEach((key) => {
        if(Array.isArray(userProps[key])) {
            t.is(userProps[key].length, user[key].length);
        }
        else {
            t.is(userProps[key], user[key]);
        }
    });
    t.true(user instanceof User);

    const channelProps = {
            id: 2,
            login: "test",
            type: "test",
            uname: "lorem",
            image: {
                20: "./asdf.png"
            },
            url: [ "https://example.com" ],
            live: {
                state: 0,
                alternateChannel: undefined
            }
        },
        channel = Channel.deserialize(channelProps);

    Object.keys(channelProps).forEach((key) => {
        if(Array.isArray(channelProps[key])) {
            t.is(channelProps[key].length, channel[key].length);
        }
        else if(key == "live") {
            t.true(channel[key] instanceof LiveState);
            t.is(channelProps[key].state, channel[key].state);
        }
        else if(typeof channelProps[key] === "object") {
            t.true(Object.keys(channelProps[key]).every((k) => channelProps[key][k] == channel[key][k]));
        }
        else {
            t.is(channelProps[key], channel[key]);
        }
    });
    t.true(channel instanceof Channel);
});

test('legacy deserialize', (t) => {
    const channelProps = {
            id: 2,
            login: "test",
            type: "test",
            uname: "lorem",
            image: {
                20: "./asdf.png"
            },
            url: [ "https://example.com" ],
            favorites: []
        },
        channel = Channel.deserialize(channelProps);
    t.true(channel instanceof Channel);

    const userProps = {
            id: 2,
            login: "test",
            type: "test",
            uname: "lorem",
            favorites: [ "test_chan" ]
        },
        user = User.deserialize(userProps);
    t.true(user instanceof User);
});
