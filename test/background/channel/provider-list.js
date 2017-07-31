import test from 'ava';
import ProviderChannelList from '../../../src/background/channel/provider-list';

test("constructor", (t) => {
    const list = new ProviderChannelList("foo");
    t.is(list.type, "foo");
});

test.todo("getUserId");
test.todo("getUser");
test.todo("getUser with wrong type");
test.todo("getUserByName");
test.todo("userExists");
test.todo("getUsers");
test.todo("getUsersByFavorite");
test.todo("getUsersByFavorite with wrong type");

test.todo("getChannelId");
test.todo("getChannel");
test.todo("getChannel with wrong type");
test.todo("getChannelByName");
test.todo("channelExists");
test.todo("getChannels");
test.todo("liveState");
test.todo("getChannelsByUserFavorites");
test.todo("getChannelsByUserFavorites with wrong type");

test("getChannelsByType", async (t) => {
    const list = new ProviderChannelList("foo");
    await t.throws(list.getChannelsByType());
    return list.close();
});

test("getUsersByType", async (t) => {
    const list = new ProviderChannelList("foo");
    await t.throws(list.getUsersByType());
    return list.close();
});
