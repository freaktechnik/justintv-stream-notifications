import test from 'ava';
import ProviderChannelList from '../../../src/background/channel/provider-list';
import ChannelList from '../../../src/background/channel/list';
import ReadChannelList from '../../../src/background/channel/read-list';
import { getUser, getChannel } from "../../helpers/channel-user";
import { User, Channel } from '../../../src/background/channel/core';

const PROVIDER = 'test';
const NOT_PROVIDER = 'extra';

test.before(async () => {
    const channels = [
            getChannel('foo', PROVIDER),
            getChannel('bar', PROVIDER),
            getChannel('lorem', NOT_PROVIDER),
            getChannel('ipsum', NOT_PROVIDER)
        ],
        users = [
            getUser('foo', PROVIDER),
            getUser('bar', NOT_PROVIDER)
        ];
    const list = new ChannelList();
    await list.addChannels(channels);
    await Promise.all(users.map((u) => list.addUser(u)));
});

test.beforeEach(async (t) => {
    if(!t.context.list) {
        t.context.list = new ProviderChannelList(PROVIDER);
        t.context.extraChannels = 2;
        t.context.extraUsers = 1;
        t.context.referenceChannel = await t.context.list.getChannelByName('foo', PROVIDER);
        t.context.referenceUser = await t.context.list.getUserByName('foo', PROVIDER);
        const allList = new ReadChannelList();
        t.context.notUser = await allList.getUser('bar', NOT_PROVIDER);
        t.context.notChannel = await allList.getChannel('lorem', NOT_PROVIDER);
    }
});

test.after.always(async () => {
    const list = new ChannelList();
    await list.clear();
    return list.close();
});

test("constructor", (t) => {
    const list = new ProviderChannelList("foo");
    t.is(list.type, "foo");
});

test("getUserId", async (t) => {
    const { referenceUser } = t.context;
    const userId = await t.context.list.getUserId(referenceUser.login);
    t.is(userId, referenceUser.id);
});

test("getUser", async (t) => {
    const { referenceUser } = t.context;
    const user = await t.context.list.getUser(referenceUser.id);
    t.is(user.id, referenceUser.id);
    t.true(user instanceof User);
});

test("getUser with wrong type", async (t) => {
    const { notUser } = t.context;
    await t.throws(t.context.list.getUser(notUser.id));
});

test("getUserByName", async (t) => {
    const { referenceUser } = t.context;
    const user = await t.context.list.getUserByName(referenceUser.login);

    t.true(user instanceof User);
    t.is(user.id, referenceUser.id);
    t.is(user.login, referenceUser.login);
    t.is(user.type, referenceUser.type);
});

test("userExists", async (t) => {
    const {
        referenceUser, notUser
    } = t.context;
    const exists = await t.context.list.userExists(referenceUser.login);
    t.true(exists);

    const notExists = await t.context.list.userExists(notUser.login);
    t.false(notExists);
});

test("getUsers", async (t) => {
    const users = await t.context.list.getUsers();
    t.is(users.length, t.context.extraUsers);
    t.is(users[0].id, t.context.referenceUser.id);
});

test.todo("getUsersByFavorite");

test("getUsersByFavorite with wrong type", async (t) => {
    const { notChannel } = t.context;
    await t.throws(t.context.list.getUsersByFavorite(notChannel));
});

test("getChannelId", async (t) => {
    const { referenceChannel } = t.context;
    const channelId = await t.context.list.getChannelId(referenceChannel.login);
    t.is(channelId, referenceChannel.id);
});

test("getChannel", async (t) => {
    const { referenceChannel } = t.context;
    const channel = await t.context.list.getChannel(referenceChannel.id);
    t.true(channel instanceof Channel);
    t.is(channel.id, referenceChannel.id);
    t.is(channel.login, referenceChannel.login);
    t.is(channel.type, referenceChannel.type);
});

test("getChannel with wrong type", async (t) => {
    const { notChannel } = t.context;
    await t.throws(t.context.list.getChannel(notChannel.id));
});

test("getChannelByName", async (t) => {
    const { referenceChannel } = t.context;
    const channel = await t.context.list.getChannelByName(referenceChannel.login);
    t.true(channel instanceof Channel);
    t.is(channel.id, referenceChannel.id);
    t.is(channel.login, referenceChannel.login);
    t.is(channel.type, referenceChannel.type);
});

test("channelExists", async (t) => {
    const {
        referenceChannel, notChannel
    } = t.context;
    const exists = await t.context.list.channelExists(referenceChannel.login);
    t.true(exists);

    const notExists = await t.context.list.channelExists(notChannel.login);
    t.false(notExists);
});

test("getChannels", async (t) => {
    const channels = await t.context.list.getChannels();
    t.is(channels.length, t.context.extraChannels);
});

test("liveState", async (t) => {
    const state = await t.context.list.liveStatus();
    t.false(state);
});

test.todo("liveState true");
test.todo("getChannelsByUserFavorites");

test("getChannelsByUserFavorites with wrong type", async (t) => {
    const { notUser } = t.context;
    await t.throws(t.context.list.getChannelsByUserFavorites(notUser));
});

test("getChannelsByType", async (t) => {
    await t.throws(t.context.list.getChannelsByType());
});

test("getUsersByType", async (t) => {
    await t.throws(t.context.list.getUsersByType());
});

test("getChannelsByType with type is equal to getChannels", async (t) => {
    const byType = await t.context.list.getChannelsByType(PROVIDER);
    const channels = await t.context.list.getChannels();
    t.deepEqual(byType, channels);
});

test("getUsersByType with type is equal to getUsers", async (t) => {
    const byType = await t.context.list.getUsersByType(PROVIDER);
    const users = await t.context.list.getUsers();
    t.deepEqual(byType, users);
});

test.todo("event filtering");
