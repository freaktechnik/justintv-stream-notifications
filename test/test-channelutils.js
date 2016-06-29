/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

const requireHelper = require("./require_helper");
const tabs = require("sdk/tabs");
const channelUtils = requireHelper('../lib/channel/utils');
const { setTimeout } = require("sdk/timers");
const { wait } = require("./event/helpers");
const { getChannel } = require("./channeluser/utils");
const { prefs } = require("sdk/simple-prefs");
const self = require("sdk/self");
const LiveState = requireHelper("../lib/channel/live-state").default;

exports['test open archive'] = function*(assert) {
    var channel = getChannel();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened woth archive url for offline channel");
    const p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test focus archive'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    tabs.open({url: self.data.url("channels-manager.html")});

    let tabToClose = yield wait(tabs, "ready");

    yield channelUtils.selectOrOpenTab(channel);

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was correctly activated");
    tabToClose.close();
    const p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open live channel when archive is already opened'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel);
    let tabToClose = yield wait(tabs, "ready");

    channel.live.setLive(true);

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.url[0], "New tab was opened for the live channel");

    tabToClose.close();
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open live channel'] = function*(assert) {
    let channel = getChannel();
    channel.live.setLive(true);
    yield channelUtils.selectOrOpenTab(channel);

    assert.equal(tabs.activeTab.url, channel.url[0], "Tab was opened for the live channel");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open hosted live channel'] = function*(assert) {
    const channel = getChannel();
    channel.live = new LiveState(LiveState.REDIRECT);
    channel.live.alternateURL = "http://example.com/alternate";
    yield channelUtils.selectOrOpenTab(channel);

    assert.equal(tabs.activeTab.url, channel.url[0], "Tab was opened for the live channel");
    const p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test force open archive'] = function*(assert) {
    let channel = getChannel();
    channel.live.setLive(true);
    channelUtils.selectOrOpenTab(channel, "archive");
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened with the archive url despite the channel being live");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open chat'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel, "chat");
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.chatUrl, "Tab was opened with the url for the chat");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

require("sdk/test").run(exports);

