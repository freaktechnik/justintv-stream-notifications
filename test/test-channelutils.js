/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

const tabs = require("sdk/tabs");
let   channelUtils = require('../lib/channel-utils');
var { setTimeout } = require("sdk/timers");
const { wait } = require("./event/helpers");
var { getChannel } = require("./channeluser/utils");

exports['test open or focus tab'] = function*(assert) {
    var channel = getChannel();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened woth archive url for offline channel");
    tabs.open({url: "http://example.com"});

    let tabToClose = yield wait(tabs, "ready");

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "activate");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was correctly activated");
    tabToClose.close();

    channel.live = true;

    tabToClose = tabs.activeTab;

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.url[0], "New tab was opened for the live channel");

    tabToClose.close();
    tabs.activeTab.close();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.url[0], "Tab was opened for the live channel");
    tabs.activeTab.close();
};

exports['test force open archive'] = function*(assert) {
    let channel = getChannel();
    channel.live = true;
    channelUtils.selectOrOpenTab(channel, "archive");
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened with the archive url despite the channel being live");
    tabs.activeTab.close();
};

exports['test open chat'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel, "chat");
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.chatUrl, "Tab was opened with the url for the chat");
    tabs.activeTab.close();
};

require("sdk/test").run(exports);

