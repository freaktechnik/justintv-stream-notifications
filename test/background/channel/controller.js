/* eslint-disable new-cap, camelcase */
/**
 * Test channel controller.
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test parental controls
 * @todo properly test events and stuff.
 */
import test from 'ava';
import ChannelController from "../../../src/background/channel/controller";
import providers from "../../../src/background/providers";
import { getMockAPIQS, IGNORE_QSUPDATE_PROVIDERS } from "../../helpers/providers/mock-qs";

const TESTUSER = {
        name: "freaktechnik",
        type: "twitch"
    },
    sendCredentials = (p) => {
        let start = 0;
        if(p == TESTUSER.type) {
            start = 1;
            SDKStubs.onMessage.dispatch({
                command: `passwords-search-${providers[p].authURL[0]}-reply`,
                payload: [
                    {
                        username: TESTUSER.name
                    },
                    {
                        username: ""
                    }
                ]
            });
        }
        for(let i = start; i < providers[p].authURL.length; ++i) {
            SDKStubs.onMessage.dispatch({
                command: `passwords-search-${providers[p].authURL[i]}-reply`,
                payload: []
            });
        }
    };

const testProviderCredentials = async (t, p) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    let res, prom;
    if(providers[p].supports.credentials) {
        prom = cc.autoAddUsers(p);
        sendCredentials(p);
        res = await prom;
        if(p == TESTUSER.type) {
            t.true(res.length > 0, "Found credential for " + p);

            const users = await cc.getUsersByType();
            await Promise.all(users.map((u) => cc.removeUser(u.id, true)));
        }
        else if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
            t.is(res.length, 0, "found no credentials for " + p);
        }
    }
    else {
        await t.throws(cc.autoAddUsers(p));
    }
};
testProviderCredentials.title = (title, p) => `${title} for ${p}`;

for(const p in providers) {
    if(!IGNORE_QSUPDATE_PROVIDERS.includes(p)) {
        test.serial('Provider credentials', testProviderCredentials, p);
    }
}

test.serial("Credentials", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    const prom = cc.autoAddUsers();

    for(const p in providers) {
        sendCredentials(p);
    }
    const res = await prom;
    t.true(res.some((r) => r.length > 0), "All credentials finds some");

    const users = await cc.getUsersByType();
    return Promise.all(users.map((u) => cc.removeUser(u.id, true)));
});

test("Add User", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    await t.throws(cc.addUser("test", "test"));
});

test.serial("User Methods", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    const user = await cc.addUser(TESTUSER.name, TESTUSER.type);

    t.is(user.login, TESTUSER.name, "Added user has correct login");
    t.is(user.type, TESTUSER.type, "Added user has correct type");
    t.true("id" in user, "Added user has an ID");

    let channels = await cc.getChannelsByType();
    t.is(channels.length, 1, "All followed channels were added");

    await t.throws(cc.addUser(TESTUSER.name, TESTUSER.type, () => true));

    let users = await cc.getUsersByType(TESTUSER.type);
    t.is(users.length, 1, "Get users by type for the user's type holds one result");
    t.is(users[0].login, TESTUSER.name, "Found user has correct login");
    t.is(users[0].type, TESTUSER.type, "Found user has correct type");
    t.is(users[0].id, user.id, "Found user has correct ID");

    users = await cc.getUsersByType();
    t.is(users.length, 1, "Getting all users holds one result");
    t.is(users[0].login, TESTUSER.name, "Found user has correct login");
    t.is(users[0].type, TESTUSER.type, "Found user has correct type");
    t.is(users[0].id, user.id, "Found user has correct ID");

    users = await cc.updateUser(user.id);
    t.is(users.length, 1, "One user was updated when updating just the user");
    t.is(users[0].login, TESTUSER.name, "Updated user has the correct login");
    t.is(users[0].type, TESTUSER.type, "Updated user has correct type");
    t.is(users[0].id, user.id, "Updated user has correct ID");

    users = await cc.updateUser();
    t.is(users.length, 1, "Updating all users updated one user");
    t.is(users[0].login, TESTUSER.name, "Updated user has the correct login");
    t.is(users[0].type, TESTUSER.type, "Updated user has the correct type");
    t.is(users[0].id, user.id, "Updated user has correct ID");

    await cc.removeUser(user.id, true);

    users = await cc.getUsersByType();
    t.is(users.length, 0, "All users were removed");
    channels = await cc.getChannelsByType();
    t.is(channels.length, 0, "All channels were removed");
});

test.serial("Remove User", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    const user = await cc.addUser(TESTUSER.name, TESTUSER.type);

    await cc.removeUser(user.id);

    const users = await cc.getUsersByType();
    t.is(users.length, 0, "User has been removed");

    await cc.getChannelsByType().then((channels) => Promise.all(channels.map((c) => cc.removeChannel(c.id))));
});

test("AddChannel", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    await t.throws(cc.addChannel("test", "test"));
});

test.serial("CancelAddChannel", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    await t.throws(cc.addChannel(TESTUSER.name, TESTUSER.type, () => true));

    const channel = await cc.addChannel(TESTUSER.name, TESTUSER.type, () => false);
    t.is(channel.login, TESTUSER.name);
    t.is(channel.type, TESTUSER.type);
    t.true("id" in channel);

    await cc.removeChannel(channel.id);
});


test.serial("Channel Methods", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    let channel = await cc.addChannel(TESTUSER.name, TESTUSER.type);

    t.is(channel.login, TESTUSER.name, "Added channel has correct login");
    t.is(channel.type, TESTUSER.type, "Added channel has correct type");
    t.true("id" in channel, "Added channel has an ID");

    const secondChannel = await cc.getChannel(channel.id);
    t.is(secondChannel.login, channel.login, "Getting the channel returns one with the same login");
    t.is(secondChannel.type, channel.type, "Getting the channel returns one with the same type");
    t.is(secondChannel.id, channel.id, "Getting the channel returns one with the same id even");

    let channels = await cc.getChannelsByType();
    t.is(channels.length, 1, "Getting all channels returns exactly one");
    t.is(channels[0].login, TESTUSER.name, "Found channel has correct login");
    t.is(channels[0].type, TESTUSER.type, "Found channel has correct type");
    t.is(channels[0].id, channel.id, "FOund channel has correct id");

    channels = await cc.getChannelsByType(TESTUSER.type);
    t.is(channels.length, 1, "Getting channels by type holds one result.");
    t.is(channels[0].login, TESTUSER.name, "Found channel has correct login");
    t.is(channels[0].type, TESTUSER.type, "Found channel has correct type");
    t.is(channels[0].id, channel.id, "Found channel has correct ID");

    channels = await cc.updateChannels(TESTUSER.type);
    t.is(channels.length, 1, "One channel was updated when updating just the channels of the type");
    t.is(channels[0].login, TESTUSER.name, "Updated channel has the correct login");
    t.is(channels[0].type, TESTUSER.type, "Updated channel has correct type");
    t.is(channels[0].id, channel.id, "Updated channel has correct ID");

    channels = await cc.updateChannels();
    t.is(channels.length, Object.keys(providers).filter((p) => providers[p].enabled).length, "There is an item per provider");
    channels.forEach((chans) => t.true(Array.isArray(chans), "Each of the items is an array"));

    // Flatten the arrays, so we have all the channels in one array.
    channels = [].concat(...channels);
    t.is(channels.length, 1, "Updating all channels updated one channel");
    t.is(channels[0].login, TESTUSER.name, "Updated channel has the correct login");
    t.is(channels[0].type, TESTUSER.type, "Updated channel has the correct type");
    t.is(channels[0].id, channel.id, "Updated channel has correct ID");

    channel = await cc.updateChannel(channel.id);
    t.is(channel.login, TESTUSER.name, "Updated channel has the correct login");
    t.is(channel.type, TESTUSER.type, "Updated channel has the correct type");
    t.is(channel.id, secondChannel.id, "Updated channel has the same ID");

    await cc.removeChannel(channel.id);

    channels = await cc.getChannelsByType();
    t.is(channels.length, 0, "All channels were removed");
});


test.serial("Queue", async (t) => {
    const cc = new ChannelController();

    // Reset queue stuff
    cc._queue.length = 0;
    cc._ready = false;

    cc._ensureQueueReady();
    t.is(cc._queue.length, 1);

    cc._ready = true;
    await cc._ensureQueueReady();
    t.is(cc._queue.length, 1);
});

test.serial("Open Manager", async (t) => {
    const cc = new ChannelController();

    browser.tabs.create.returns(Promise.resolve({
        id: 'tab'
    }));

    await cc.showManager();

    t.true(browser.tabs.create.calledOnce, "Manager tab was opened.");

    await cc.showManager();
    t.true(browser.tabs.update.calledOnce);
    t.is(browser.tabs.update.lastCall.args[0], 'tab');

    browser.tabs.create.reset();
});

test("Disabled Provider", async (t) => {
    const p = Object.keys(providers).find((pr) => !providers[pr].enabled);

    if(p) {
        const cc = new ChannelController();
        await cc._ensureQueueReady();

        await t.throws(cc.addChannel(TESTUSER.name, p));

        //TODO place a channel in the channel list so we can test this
        //const r = await cc.updateChannel(channel.id);
        //t.is(r, null);

        const channels = await cc.updateChannels(p);
        t.is(channels.length, 0, "No channels were updated");

        //TODO make sure removeChannel doesn't throw
        //await cc.removeChannel(channel.id);

        await t.throws(cc.addUser(TESTUSER.name, p));

        //TODO also test user functions.
    }
    else {
        t.pass("No disabled provider found");
        //TODO have a plan b here.
    }
});

test.serial.todo("Copy local channel to clipboard");
/*
test.serial.failing("Copy Local Channel To Clipboard", async (t) => {
    t.fail("Clipboard tests need to be updated");
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    const referenceChannel = await cc.addChannel(TESTUSER.name, TESTUSER.type);

    const prevClipboard = clipboard.get();

    clipboard.set("foobar", "text");

    const channel = await cc.copyChannelURL(referenceChannel.id);
    t.is(channel.id, referenceChannel.id, "Channel returned is the same as the one we requested to copy the URL for");
    t.is(channel.url[0], clipboard.get(), "Copied URL matches the channel's URL");

    clipboard.set("foobar", "text");

    const prevPattern = prefs.copy_pattern;
    prefs.copy_pattern = "Test {URL} foo bar";
    const expectedString = prefs.copy_pattern.replace("{URL}", channel.url[0]);
    await cc.copyChannelURL(channel.id);
    t.is(expectedString, clipboard.get(), "Copied string matches waht we'd expect based on the pref");
    prefs.copy_pattern = prevPattern;

    //TODO test alternativeURL

    if(prevClipboard) {
        clipboard.set(prevClipboard);
    }
    await cc.removeChannel(channel.id);
});

test.serial.failing("Copy External Channel To Clipboard", async (t) => {
    t.fail("Clipboard tests need to be updated");
    return;
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    const prevClipboard = clipboard.get();
    clipboard.set("foobar", "text");

    const channel = await cc.copyChannelURL(TESTUSER.name, TESTUSER.type);
    t.is(channel.type, TESTUSER.type, "Channel type matches the type we gave");
    t.is(channel.login, TESTUSER.name, "Channel login matches the given login");
    t.is(channel.url[0], clipboard.get(), "Copied URL matches the channel's URL");

    if(prevClipboard) {
        clipboard.set(prevClipboard);
    }
});*/
test.serial.todo("Copy external channel to clipboard");

test("Copy Invalid Channel To Clipboard", async (t) => {
    const cc = new ChannelController();
    await cc._ensureQueueReady();

    await t.throws(cc.copyChannelURL(TESTUSER.name, "foobar"));
});

let oldQS;
test.before(() => {
    const provider = providers[TESTUSER.type];
    oldQS = provider._qs;

    provider._setQs(getMockAPIQS(oldQS, TESTUSER.type, false));
});

test.after(() => {
    providers[TESTUSER.type]._setQs(oldQS);
    SDKStubs.onMessage._listeners.length = 0;
});
