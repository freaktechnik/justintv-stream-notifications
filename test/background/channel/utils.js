/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */
import test from "ava";
import { selectOrOpenTab } from '../../../src/background/channel/utils';
import { getChannel } from "../../helpers/channel-user";
import LiveState from "../../../src/background/channel/live-state";
import { setup } from "../../helpers/default-behavior";

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

    await setupAndRun([ channel, "archive" ]);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.archiveUrl);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.archiveUrl, "Tab was opened with the archive url despite the channel being live");
});

test.serial('open chat', async (t) => {
    const channel = getChannel();

    await setupAndRun([ channel, "chat" ]);

    t.true(browser.tabs.query.calledOnce);
    t.is(browser.tabs.query.lastCall.args[0].url[0], channel.chatUrl);
    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, channel.chatUrl, "Tab was opened with the url for the chat");
});
