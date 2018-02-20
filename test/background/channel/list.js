/**
 * @author Martin Giger
 * @license MPL-2.0
 * @todo Test events other than ready
 */
import test from 'ava';
import ChannelList from '../../../src/background/channel/list';
import {
    User, Channel
} from '../../../src/background/channel/core';
import {
    getUser, getChannel
} from "../../helpers/channel-user";
import { when } from "../../../src/utils";
import prefs from '../../../src/prefs.json';
import DatabaseManager from '../../../src/database-manager';

test.serial('get invalid users', (t) => Promise.all([
    t.throws(t.context.list.getUser(), Error, 'Missing ID'),
    t.throws(t.context.list.getUser(-1), Error, 'unavailable ID'),
    t.throws(t.context.list.getUser('doesnot', 'exist'), Error, 'Unavailable user info')
]));

test.serial('add-remove user', async (t) => {
    const referenceUser = getUser();
    let user = await t.context.list.addUser(referenceUser);

    t.true(user instanceof User, "User is a user");
    t.true("id" in user, "The user has an ID");
    t.is(user.uname, referenceUser.uname);

    await t.throws(t.context.list.addUser(referenceUser));

    user = getUser();
    user.uname = 'foo bar';
    user.favorites.push("test_chan");

    user = await t.context.list.setUser(user);

    t.true(user instanceof User);
    t.is(user.uname, 'foo bar');

    const nuser = await t.context.list.removeUser(user.id);

    t.true(nuser instanceof User);
    t.is(nuser.id, user.id);

    await t.throws(t.context.list.getUser(user.id));
});

test.serial('get user by login and type', async (t) => {
    const referenceUser = await t.context.list.addUser(getUser()),
        user = await t.context.list.getUser('test', 'test');
    t.true(user instanceof User, "The user is a user");
    t.true("id" in user, "User has an ID");
    t.is(user.login, referenceUser.login);
    t.is(user.type, referenceUser.type);
    t.is(user.uname, referenceUser.uname);
});

test.serial('get user by id', async (t) => {
    const referenceUser = await t.context.list.addUser(getUser()),
        user = await t.context.list.getUser(referenceUser.id);
    t.true(user instanceof User, "The same user is a user");
    t.is(user.id, referenceUser.id, "The same user has the same ID");
});

test.serial('set new user', async (t) => {
    const newUser = getUser('test2');
    newUser.id = 2;

    const user = await t.context.list.setUser(newUser);

    t.true(user instanceof User);
    t.is(user.login, newUser.login);
    t.is(user.id, newUser.id);
});

test.serial('get user id', async (t) => {
    const user = await t.context.list.addUser(getUser()),
        userId = await t.context.list.getUserId(user.login, user.type);
    t.is(user.id, userId);
});

test.serial('get users by type', async (t) => {
    const user1 = await t.context.list.addUser(getUser()),
        user2 = getUser('test2');
    await t.context.list.addUser(user2);

    const users = await t.context.list.getUsersByType(user1.type);
    t.is(users.length, 2);
    users.forEach((user) => {
        t.true(user instanceof User);
        t.is(user.type, "test");
    });
});

test.serial('get all users', async (t) => {
    await t.context.list.addUser(getUser());
    await t.context.list.addUser(getUser("test2", "lorem"));
    const users = await t.context.list.getUsersByType();
    t.is(users.length, 2 + t.context.extraUsers);
    users.forEach((user) => {
        t.true(user instanceof User);
    });
});

test.serial('get users by favorite', async (t) => {
    const chan = getChannel("test_chan"),
        user = getUser();
    user.favorites = [ chan.login ];
    await t.context.list.addUser(user);

    const users = await t.context.list.getUsersByFavorite(chan);
    t.is(users.length, 1, "Correct amont of users with test_chan as favorite");
    t.true(users[0] instanceof User, "Returned user is a User");
    t.is(users[0].favorites[0], chan.login, "User has test_chan as favorite");
});

test.serial('add channel', async (t) => {
    const referenceChannel = getChannel(),
        channel = await t.context.list.addChannel(referenceChannel);

    t.true(channel instanceof Channel, "Channel is a channel");
    t.true("id" in channel, "The channel has an ID");
    t.is(channel.uname, referenceChannel.uname);
    t.is(channel.type, referenceChannel.type);
    t.is(channel.login, referenceChannel.login);

    await t.throws(t.context.list.addChannel(referenceChannel));
});

test.serial('remove channel by id', async (t) => {
    const channel = await t.context.list.addChannel(getChannel()),
        removedChannel = await t.context.list.removeChannel(channel.id);

    t.is(removedChannel.id, channel.id, "Removed channel matches the channel to be removed");

    const exists = await t.context.list.channelExists(channel.id);
    t.false(exists, "Channel was removed");
});

test.serial('remove channel by login and type', async (t) => {
    const channel = await t.context.list.addChannel(getChannel()),
        removedChannel = await t.context.list.removeChannel(channel.login, channel.type);

    t.is(removedChannel.id, channel.id, "Removed channel matches the channel to be removed");

    const exists = await t.context.list.channelExists(channel.id);
    t.false(exists, "Channel was removed");
});

test.serial('clear channellist', async (t) => {
    await t.context.list.addChannel(getChannel());
    await t.context.list.addUser(getUser());

    const result = await t.context.list.clear();

    t.is(typeof result, "boolean", "Result is a boolean");
    t.false(result, "No hard clear was needed");

    const chans = await t.context.list.getChannelsByType();
    t.is(chans.length, 0);

    const users = await t.context.list.getUsersByType();
    t.is(users.length, 0);
});

test.serial('clear without db', async (t) => {
    // emulate DB never initialized
    await t.context.list.close();

    const result = await t.context.list.clear();

    t.is(typeof result, "boolean", "Result is a boolean");
    t.true(result, "DB had to be cleared the hard way");
    t.not(t.context.list.db, null, "DB was opened again");

    const chans = await t.context.list.getChannelsByType();
    t.is(chans.length, 0);

    const users = await t.context.list.getUsersByType();
    t.is(users.length, 0);
});

test.serial('clear event', async (t) => {
    let p = when(t.context.list, "clear");
    let r = await t.context.list.clear();

    let { detail: result } = await p;
    t.is(r, result, 'Promise and event hold same soft-clear flag');
    t.false(result, "DB was soft cleared");

    await t.context.list.close();

    p = when(t.context.list, "clear");
    r = await t.context.list.clear();

    result = await p;
    result = result.detail;
    t.true(result, "DB was hard cleared");
    t.is(result, r, 'Promise and event hold the same data');
});

test.serial('add one channel with addchannels', async (t) => {
    const chan = getChannel(),
        channels = await t.context.list.addChannels(chan);

    t.is(channels.length, 1);
    t.true(channels[0] instanceof Channel, "Channel is a channel");
    t.true("id" in channels[0], "The channel has an ID");
    t.is(channels[0].uname, "lorem ipsum");
});

test.serial('add one channel in an array with addchannels', async (t) => {
    const chan = getChannel(),
        channels = await t.context.list.addChannels([ chan ]);

    t.is(channels.length, 1);
    t.true(channels[0] instanceof Channel, "Channel is a channel");
    t.true("id" in channels[0], "The channel has an ID");
    t.is(channels[0].uname, "lorem ipsum");
});

test.serial('add channels', async (t) => {
    const chans = [
            getChannel(),
            getChannel("foo")
        ],
        channels = await t.context.list.addChannels(chans);

    t.is(channels.length, 2);
    channels.forEach((channel, i) => {
        t.true(channel instanceof Channel, "Channel is a channel");
        t.true("id" in channel, "The channel has an ID");
        t.is(channel.uname, chans[i].uname);
    });
});

test.serial('add existing channels', async (t) => {
    let channels = [
        getChannel(),
        getChannel("lorem")
    ];
    await t.context.list.addChannels(channels);
    channels = await t.context.list.addChannels(channels);
    t.is(channels.length, 0);
});

test.serial('empty arguments for addchannels', async (t) => {
    let channels = await t.context.list.addChannels([]);
    t.is(channels.length, 0);
    channels = await t.context.list.addChannels();
    t.is(channels.length, 0);
});

test.serial('get channel', async (t) => {
    const referenceChannel = await t.context.list.addChannel(getChannel()),
        channel = await t.context.list.getChannel(referenceChannel.login, referenceChannel.type);
    t.true(channel instanceof Channel, "The channel is a channel");
    t.is(channel.id, referenceChannel.id, "Channel has an ID");
    t.is(channel.login, referenceChannel.login);
    t.is(channel.type, referenceChannel.type);
    t.is(channel.uname, referenceChannel.uname);
});

test.serial('get channel by id', async (t) => {
    const referenceChannel = await t.context.list.addChannel(getChannel()),
        channel = await t.context.list.getChannel(referenceChannel.id);
    t.true(channel instanceof Channel);
    t.is(referenceChannel.id, channel.id);
});

test.serial('get invalid channel', (t) => Promise.all([
    t.throws(t.context.list.getChannel(), Error, 'No ID'),
    t.throws(t.context.list.getChannel(-1), Error, 'Invalid ID'),
    t.throws(t.context.list.getChannel('doesnot', 'exist'), Error, 'Invalid info')
]));

test.serial('set channel', async (t) => {
    const referenceChannel = await t.context.list.addChannel(getChannel());
    referenceChannel.uname = 'foo bar';
    const channel = await t.context.list.setChannel(referenceChannel);

    t.true(channel instanceof Channel);
    t.is(channel.id, referenceChannel.id);
    t.is(channel.uname, referenceChannel.uname);
});

test.serial('set channel without id', async (t) => {
    const referenceChannel = getChannel(),
        storedChannel = await t.context.list.addChannel(referenceChannel),
        id = storedChannel.id;
    referenceChannel.uname = 'foo bar';
    delete referenceChannel.id;
    const channel = await t.context.list.setChannel(referenceChannel);

    t.true(channel instanceof Channel);
    t.is(id, channel.id);
    t.is(channel.uname, referenceChannel.uname);
});

test.serial('set new channel', async (t) => {
    const referenceChannel = getChannel();
    referenceChannel.id = 0;
    const channel = await t.context.list.setChannel(referenceChannel);
    t.true(channel instanceof Channel);
    t.is(referenceChannel.login, channel.login);
    t.is(referenceChannel.type, channel.type);
});

test.serial('get channel id', async (t) => {
    const referenceChannel = await t.context.list.addChannel(getChannel()),
        channelId = await t.context.list.getChannelId(referenceChannel.login, referenceChannel.type);
    t.is(referenceChannel.id, channelId);
});

test.serial('channel exists', async (t) => {
    const referenceChannel = await t.context.list.addChannel(getChannel());

    let exists = await t.context.list.channelExists(referenceChannel.login, referenceChannel.type);
    t.true(exists, "The test_chan channel exists");

    exists = await t.context.list.channelExists(referenceChannel.id);
    t.true(exists, "The reference channel also exists when checked by id");

    const doesntexist = await t.context.list.channelExists('doesnot', 'exist');
    t.false(doesntexist, "The doesnot channel doesn't exist");
});

test.serial('user exists', async (t) => {
    const referenceUser = await t.context.list.addUser(getUser());

    let exists = await t.context.list.userExists(referenceUser.login, referenceUser.type);
    t.true(exists, "The test user exists");

    exists = await t.context.list.userExists(referenceUser.id);
    t.true(exists, "The reference user also exists when checked by id");

    const doesntexist = await t.context.list.userExists('doesnot', 'exist');
    t.false(doesntexist, "The doesnot user doesn't exist");
});

test.serial('live status offline', async (t) => {
    const channel = await t.context.list.addChannel(getChannel());

    let liveStatus = await t.context.list.liveStatus(null);
    t.false(liveStatus);

    liveStatus = await t.context.list.liveStatus(channel.type);
    t.false(liveStatus);

    liveStatus = await t.context.list.liveStatus("exist");
    t.false(liveStatus);
});

test.serial('live status live', async (t) => {
    const channel = getChannel();
    channel.live.setLive(true);
    await t.context.list.addChannel(channel);

    let liveStatus = await t.context.list.liveStatus(null);
    t.true(liveStatus);

    liveStatus = await t.context.list.liveStatus(channel.type);
    t.true(liveStatus);

    liveStatus = await t.context.list.liveStatus("exist");
    t.false(liveStatus);
});

test.serial('get channels by type', async (t) => {
    const channel = await t.context.list.addChannel(getChannel());
    await t.context.list.addChannel(getChannel("foo"));

    const channels = await t.context.list.getChannelsByType(channel.type);
    t.is(channels.length, 2);
    channels.forEach((channel) => {
        t.true(channel instanceof Channel);
        t.is(channel.type, "test");
    });
});

test.serial('get all channels', async (t) => {
    await t.context.list.addChannel(getChannel());
    await t.context.list.addChannel(getChannel("foo", "bar"));

    const channels = await t.context.list.getChannelsByType(null);
    t.is(channels.length, 2 + t.context.extraChannels);
    channels.forEach((channel) => {
        t.true(channel instanceof Channel);
    });
});

test.serial('get channels by user favorites', async (t) => {
    const channel = getChannel();
    await t.context.list.addChannel(channel);

    const referenceUser = getUser();
    referenceUser.favorites = [ channel.login ];
    await t.context.list.addUser(referenceUser);

    const channels = await t.context.list.getChannelsByUserFavorites(referenceUser);
    t.is(channels.length, 1);
    channels.forEach((channel) => {
        t.true(referenceUser.favorites.find((fav) => fav === channel.login) !== undefined);
    });
});

test.serial('remove users with favorite', async (t) => {
    const channel = await t.context.list.addChannel(getChannel());
    let user = getUser();
    user.favorites = [ channel.login ];
    user = await t.context.list.addUser(user);

    const users = await t.context.list.removeUsersWithFavorite(channel);
    t.is(users.length, 1);
    t.is(users[0].id, user.id, "User has been deleted");
});

test.serial('remove channels by user favorites', async (t) => {
    const channel = await t.context.list.addChannel(getChannel());
    let user = getUser();
    user.favorites = [ channel.login ];
    user = await t.context.list.addUser(user);

    const channels = await t.context.list.removeChannelsByUserFavorites(user.id);
    t.is(channels.length, 1);
    t.is(channels[0].id, channel.id);
});

test.serial('channel offline setting', async (t) => {
    const rawChannel = getChannel();
    rawChannel.live.setLive(true);
    const channel = rawChannel.serialize();
    channel.lastModified = Date.now() - (2 * prefs.channellist_cacheTime.value);
    const transaction = t.context.list.db.transaction("channels", "readwrite"),
        store = transaction.objectStore("channels"),
        req = store.add(channel);

    await DatabaseManager._waitForRequest(req);
    await t.context.list.close();
    await DatabaseManager.open();
    const ch = await t.context.list.getChannel(channel.login, channel.type);
    const isLive = await ch.live.isLive();
    t.false(isLive);
});

test.serial('set channel with new login', async (t) => {
    const channel = await t.context.list.addChannel(getChannel()),
        sameChannel = getChannel("newlogin", channel.type, channel.id),
        newChannel = await t.context.list.setChannel(sameChannel);
    t.is(newChannel.id, channel.id);
    t.is(newChannel.login, sameChannel.login);
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
    db.close();

    await t.notThrows(DatabaseManager.open());
});

test.todo("event forwarding");

test.serial.beforeEach(async (t) => {
    const channels = [
        getChannel('foo', 'extra'),
        getChannel('bar', 'extra'),
        getChannel('lorem', 'extra'),
        getChannel('ipsum', 'extra')
    ];
    const users = [
        getUser('foo', 'extra'),
        getUser('bar', 'extra')
    ];
    if(!t.context.list) {
        t.context.list = new ChannelList();
    }
    t.context.extraChannels = channels.length;
    t.context.extraUsers = users.length;

    await t.context.list.addChannels(channels);
    return Promise.all(users.map((u) => t.context.list.addUser(u)));
});
test.serial.afterEach.always(async (t) => {
    await DatabaseManager.open();
    await t.context.list.clear();
});
