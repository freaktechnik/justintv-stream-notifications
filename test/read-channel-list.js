/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test events other than ready
 */
import test from 'ava';
import ChannelList from '../src/background/channel/list';
import ReadChannelList from '../src/read-channel-list';
import { getUser, getChannel } from "./helpers/channel-user";
import DatabaseManager from '../src/database-manager';
import sinon from 'sinon';

const setupDB = async () => {
    const channels = [
            getChannel('foo', 'extra'),
            getChannel('bar', 'extra'),
            getChannel('lorem', 'extra'),
            getChannel('ipsum', 'extra')
        ],
        users = [
            getUser('foo', 'extra'),
            getUser('bar', 'extra')
        ];
    const list = new ChannelList();
    await list.addChannels(channels);
    await Promise.all(users.map((u) => list.addUser(u)));
};

test("Static properties", (t) => {
    t.true("name" in ReadChannelList);
    t.is(typeof ReadChannelList.name, "string");
});


test.serial('get invalid users', (t) => Promise.all([
    t.throws(t.context.list.getUser(), Error, 'Missing ID'),
    t.throws(t.context.list.getUser(-1), Error, 'unavailable ID'),
    t.throws(t.context.list.getUser('doesnot', 'exist'), Error, 'Unavailable user info')
]));

test.serial('get user by login and type', async (t) => {
    const referenceUser = await t.context.list.getUser(t.context.referenceUser),
        user = await t.context.list.getUser(referenceUser.login, referenceUser.type);
    t.true("id" in user, "User has an ID");
    t.is(user.login, referenceUser.login);
    t.is(user.type, referenceUser.type);
    t.is(user.uname, referenceUser.uname);
});

test.serial('get user by id', async (t) => {
    const user = await t.context.list.getUser(t.context.referenceUser);
    t.is(user.id, t.context.referenceUser, "The same user has the same ID");
});

test.serial('get user id', async (t) => {
    const user = await t.context.list.getUser(t.context.referenceUser),
        userId = await t.context.list.getUserId(user.login, user.type);
    t.is(user.id, userId);
});

test.serial('get users by type', async (t) => {
    const list = new ChannelList();
    const user1 = await list.addUser(getUser()),
        user2 = await list.addUser(getUser('test2'));

    const users = await t.context.list.getUsersByType(user1.type);
    t.is(users.length, 2);
    users.forEach((user) => {
        t.is(user.type, "test");
    });

    await list.removeUser(user1.id);
    await list.removeUser(user2.id);
});

test.serial('get all users', async (t) => {
    const users = await t.context.list.getUsersByType();
    t.is(users.length, t.context.extraUsers);
});

test.serial('get users by favorite', async (t) => {
    const list = new ChannelList();
    const chan = getChannel("test_chan"),
        user = getUser();
    user.favorites = [ chan.login ];
    const { id: userId } = await list.addUser(user);

    const users = await t.context.list.getUsersByFavorite(chan);
    t.is(users.length, 1, "Correct amont of users with test_chan as favorite");
    t.is(users[0].favorites[0], chan.login, "User has test_chan as favorite");

    await list.removeUser(userId);
});

test.serial('get channel', async (t) => {
    const referenceChannel = await t.context.list.getChannel(t.context.referenceChannel),
        channel = await t.context.list.getChannel(referenceChannel.login, referenceChannel.type);
    t.is(channel.id, referenceChannel.id, "Channel has an ID");
    t.is(channel.login, referenceChannel.login);
    t.is(channel.type, referenceChannel.type);
    t.is(channel.uname, referenceChannel.uname);
});

test.serial('get channel by id', async (t) => {
    const channel = await t.context.list.getChannel(t.context.referenceChannel);
    t.is(t.context.referenceChannel, channel.id);
});

test.serial('get invalid channel', (t) => Promise.all([
    t.throws(t.context.list.getChannel(), Error, 'No ID'),
    t.throws(t.context.list.getChannel(-1), Error, 'Invalid ID'),
    t.throws(t.context.list.getChannel('doesnot', 'exist'), Error, 'Invalid info')
]));

test.serial('get channel id', async (t) => {
    const referenceChannel = await t.context.list.getChannel(t.context.referenceChannel),
        channelId = await t.context.list.getChannelId(referenceChannel.login, referenceChannel.type);
    t.is(referenceChannel.id, channelId);
});

test.serial('channel exists', async (t) => {
    const referenceChannel = await t.context.list.getChannel(t.context.referenceChannel);

    let exists = await t.context.list.channelExists(referenceChannel.login, referenceChannel.type);
    t.true(exists, "The test_chan channel exists");

    exists = await t.context.list.channelExists(referenceChannel.id);
    t.true(exists, "The reference channel also exists when checked by id");

    const doesntexist = await t.context.list.channelExists('doesnot', 'exist');
    t.false(doesntexist, "The doesnot channel doesn't exist");
});

test.serial('user exists', async (t) => {
    const referenceUser = await t.context.list.getUser(t.context.referenceUser);

    let exists = await t.context.list.userExists(referenceUser.login, referenceUser.type);
    t.true(exists, "The test user exists");

    exists = await t.context.list.userExists(referenceUser.id);
    t.true(exists, "The reference user also exists when checked by id");

    const doesntexist = await t.context.list.userExists('doesnot', 'exist');
    t.false(doesntexist, "The doesnot user doesn't exist");
});

test.serial('get channels by type', async (t) => {
    const list = new ChannelList();
    const channel = await list.addChannel(getChannel());
    const secondChannel = await list.addChannel(getChannel("foo"));

    const channels = await t.context.list.getChannelsByType(channel.type);
    t.is(channels.length, 2);
    channels.forEach((channel) => {
        t.is(channel.type, "test");
    });

    await list.removeChannel(channel.id);
    await list.removeChannel(secondChannel.id);
});

test.serial('get all channels', async (t) => {
    const channels = await t.context.list.getChannelsByType(null);
    t.is(channels.length, t.context.extraChannels);
});

test.serial('get channels by user favorites', async (t) => {
    const channel = await t.context.list.getChannel(t.context.referenceChannel);

    const referenceUser = getUser('foo', channel.type);
    referenceUser.favorites = [ channel.login ];

    const channels = await t.context.list.getChannelsByUserFavorites(referenceUser);
    t.is(channels.length, 1);
    channels.forEach((channel) => {
        t.true(referenceUser.favorites.find((fav) => fav === channel.login) !== undefined);
    });
});

test.serial('upgrade from v2 to v3 shouldnt fail opening', async (t) => {
    await t.context.list.close();
    await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DatabaseManager.name);
        request.onerror = reject;
        request.onsuccess = resolve;
    });

    const request = indexedDB.open(DatabaseManager.name, 2);
    request.onupgradeneeded = (e) => {
        DatabaseManager.versions.initialize(e);
    };
    const { target: { result: db } } = await new Promise((resolve, reject) => {
        request.onsuccess = resolve;
        request.onerror = reject;
    });
    await db.close();

    await t.notThrows(DatabaseManager.open());
    await t.context.list.close();
    await setupDB();
});

test("event filtering", (t) => {
    t.true(t.context.list.filterEvents());
});

test('_waitForCursor error', async (t) => {
    const request = {};
    const cbk = sinon.spy();
    const p = t.context.list._waitForCursor(request, cbk);

    request.onerror(new Error());
    await t.throws(p);
});

test.before(setupDB);

test.serial.beforeEach(async (t) => {
    if(!t.context.list) {
        t.context.list = new ReadChannelList();
        t.context.extraChannels = 4;
        t.context.extraUsers = 2;
    }
    t.context.referenceChannel = await t.context.list.getChannelId('foo', 'extra');
    t.context.referenceUser = await t.context.list.getUserId('foo', 'extra');
});

test.after.always(async () => {
    const list = new ChannelList();
    await list.clear();
    return list.close();
});
