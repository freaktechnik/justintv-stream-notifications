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
};

const testProviderCredentials = async (t, p) => {
    const cc = new ChannelController();

    let res, prom;
    if(providers[p].supports.credentials) {
        prom = cc.autoAddUsers(p);
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
        if(p != TESTUSER.type) {
            test('Provider credentials', testProviderCredentials, p);
        }
        else {
            // needs to be serial when not failing
            test.failing('Provider credentials', testProviderCredentials, p);
        }
    }
}

// needs to be serial when not failing
test.serial.failing("Credentials", async (t) => {
    const cc = new ChannelController();

    const prom = cc.autoAddUsers();

    const res = await prom;
    t.true(res.some((r) => r.length > 0), "All credentials finds some");

    const users = await cc.getUsersByType();
    return Promise.all(users.map((u) => cc.removeUser(u.id, true)));
});

test("Add User", async (t) => {
    const cc = new ChannelController();

    await t.throws(cc.addUser("test", "test"));
});

test.serial("User Methods", async (t) => {
    const cc = new ChannelController();

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

    const user = await cc.addUser(TESTUSER.name, TESTUSER.type);

    await cc.removeUser(user.id);

    const users = await cc.getUsersByType();
    t.is(users.length, 0, "User has been removed");

    await cc.getChannelsByType().then((channels) => Promise.all(channels.map((c) => cc.removeChannel(c.id))));
});

test("AddChannel", async (t) => {
    const cc = new ChannelController();

    await t.throws(cc.addChannel("test", "test"));
});

test.serial("CancelAddChannel", async (t) => {
    const cc = new ChannelController();

    await t.throws(cc.addChannel(TESTUSER.name, TESTUSER.type, () => true));

    const channel = await cc.addChannel(TESTUSER.name, TESTUSER.type, () => false);
    t.is(channel.login, TESTUSER.name);
    t.is(channel.type, TESTUSER.type);
    t.true("id" in channel);

    await cc.removeChannel(channel.id);
});


test.serial("Channel Methods", async (t) => {
    const cc = new ChannelController();

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

test.serial("Open Manager", async (t) => {
    const cc = new ChannelController();

    browser.tabs.create.resolves({
        id: 'tab'
    });

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

test('getExternalChannel throws with unknown type', (t) => {
    const cc = new ChannelController();

    return t.throws(cc.getExternalChannel('foo', 'bar'));
});

test('getExternalChannel', async (t) => {
    const cc = new ChannelController();

    const channel = await cc.getExternalChannel(TESTUSER.name, TESTUSER.type);

    t.is(channel.login, TESTUSER.name);
    t.is(channel.type, TESTUSER.type);
    t.false('id' in channel);
});

let oldQS;
test.before(() => {
    const provider = providers[TESTUSER.type];
    oldQS = provider._qs;

    provider._setQs(getMockAPIQS(oldQS, TESTUSER.type, false));
});

test.after(() => {
    providers[TESTUSER.type]._setQs(oldQS);
});
