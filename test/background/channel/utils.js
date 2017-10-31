/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from "ava";
import { selectOrOpenTab, formatChannel, filterExistingFavs } from '../../../src/background/channel/utils';
import { getChannel, getUser } from "../../helpers/channel-user";
import { setup } from "../../helpers/default-behavior";
import LiveState from '../../../src/live-state.json';

const setupAndRun = (args, tabId) => {
    const tabs = [];
    if(tabId !== undefined) {
        tabs.push({ id: tabId });
    }
    browser.tabs.query.resolves(tabs);

    return selectOrOpenTab(...args);
};

test.beforeEach(() => {
    browser.flush();
    setup();
});

test.serial('open archive', async (t) => {
    const channel = getChannel();

    await setupAndRun([ channel ]);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.archiveUrl);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.archiveUrl, "Tab was opened woth archive url for offline channel");
});

test.serial('focus archive', async (t) => {
    const channel = getChannel();

    await setupAndRun([ channel ], 5);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.archiveUrl);
    t.true(browser.tabs.update.calledOnce);
    t.is(browser.tabs.update.lastCall.args[0], 5);
    t.true(browser.tabs.update.lastCall.args[1].active);
});

test.serial('open live channel', async (t) => {
    const channel = getChannel();

    channel.live.setLive(true);

    await setupAndRun([ channel ]);

    t.true(browser.tabs.query.calledOnce);
    t.deepEqual(browser.tabs.query.lastCall.args[0].url, channel.url);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.url[0], "New tab was opened for the live channel");
});

test.serial('open hosted live channel', async (t) => {
    const channel = getChannel();
    channel.live.redirectTo(getChannel('alternate'));

    await setupAndRun([ channel ]);

    t.true(browser.tabs.query.calledOnce);
    t.deepEqual(browser.tabs.query.lastCall.args[0].url, channel.url);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.url[0], "Tab was opened for the live channel");
});

test.serial('force open archive', async (t) => {
    const channel = getChannel();
    channel.live.setLive(true);

    await setupAndRun([
        channel,
        "archive"
    ]);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.archiveUrl);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.archiveUrl, "Tab was opened with the archive url despite the channel being live");
});

test.serial('open chat', async (t) => {
    const channel = getChannel();

    await setupAndRun([
        channel,
        "chat"
    ]);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.chatUrl);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.chatUrl, "Tab was opened with the url for the chat");
});

test('does support livestreamer', (t) => {
    const channel = getChannel();
    channel.live.setLive(true);

    return t.notThrows(selectOrOpenTab(channel, 'livestreamer'));
});

test('formatChannel without channel', (t) => t.throws(formatChannel('test'), TypeError, 'Invalid channel provided'));

test('formatChannel with patterns', async (t) => {
    const channel = getChannel();
    channel.title = 'test title';
    channel.live.setLive(true);
    const formattedChannel = await formatChannel(channel, [ 'test' ]);
    t.is(formattedChannel.live.state, LiveState.REBROADCAST);
});

test('formatChannel with patterns that does not match', async (t) => {
    const channel = getChannel();
    channel.title = 'test title';
    channel.live.setLive(true);
    const formattedChannel = await formatChannel(channel, [ 'foo' ]);
    t.is(formattedChannel.live.state, LiveState.LIVE);
});

test('formatChannel with default patterns that match with brackets', async (t) => {
    const channel = getChannel();
    channel.title = '[REBROADCAST] title';
    channel.live.setLive(true);
    const formattedChannel = await formatChannel(channel);
    t.is(formattedChannel.live.state, LiveState.REBROADCAST);
});

test('formatChannel with patterns for alternateChannel', async (t) => {
    const channel = getChannel();
    channel.title = 'test title';
    channel.live.redirectTo(channel);
    const formattedChannel = await formatChannel(channel, [ 'test' ]);
    t.is(formattedChannel.live.state, LiveState.REDIRECT);
    t.is(formattedChannel.live.alternateChannel.live.state, LiveState.REBROADCAST);
});

test('formatChannel with patterns for alternateChannel that do not match', async (t) => {
    const channel = getChannel();
    channel.title = 'test title';
    channel.live.redirectTo(channel);
    const formattedChannel = await formatChannel(channel, [ 'foo' ]);
    t.is(formattedChannel.live.state, LiveState.REDIRECT);
    t.is(formattedChannel.live.alternateChannel.live.state, LiveState.REDIRECT);
});

test('formatChannel with default patterns for alternateChannel', async (t) => {
    const channel = getChannel();
    channel.title = ' [Rerun] title ';
    channel.live.redirectTo(channel);
    const formattedChannel = await formatChannel(channel);
    t.is(formattedChannel.live.state, LiveState.REDIRECT);
    t.is(formattedChannel.live.alternateChannel.live.state, LiveState.REBROADCAST);
});

test.todo('formatChannels without serialization');
test.todo('formatChannels with serialization');

test('filterExistingFavs', (t) => {
    const channels = [ getChannel() ],
        user = getUser();
    user.favorites = channels.map((c) => c.login);
    channels.push(getChannel('foo'));

    const notExistingFavs = filterExistingFavs(user, channels);
    t.is(notExistingFavs.length, 1);
});
