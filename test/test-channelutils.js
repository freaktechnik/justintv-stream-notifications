/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

const requireHelper = require("./require_helper");
const tabs = require("sdk/tabs");
let   channelUtils = requireHelper('../lib/channel/utils');
var { setTimeout } = require("sdk/timers");
const { wait } = require("./event/helpers");
var { getChannel } = require("./channeluser/utils");
const { prefs } = require("sdk/simple-prefs");

exports['test open archive'] = function*(assert) {
    var channel = getChannel();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened woth archive url for offline channel");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test focus archive'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    tabs.open({url: "http://example.com"});

    let tabToClose = yield wait(tabs, "ready");

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "activate");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was correctly activated");
    tabToClose.close();
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open live channel when archive is already opened'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel);
    let tabToClose = yield wait(tabs, "ready");

    channel.live = true;

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
    channel.live = true;
    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.url[0], "Tab was opened for the live channel");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test force open archive'] = function*(assert) {
    let channel = getChannel();
    channel.live = true;
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

exports['test open live channel with livestreamer'] = function*(assert) {
    let channel = getChannel();
    channel.live = true;
    yield channelUtils.selectOrOpenTab(channel, "livestreamer");
    assert.notEqual(tabs.activeTab.url, channel.archiveUrl, "No tab opened when starting livestreamer");
};

exports['test open offline channel with livestreamer'] = function*(assert) {
    let channel = getChannel();
    channelUtils.selectOrOpenTab(channel, "livestreamer");
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, channel.archiveUrl, "Tab was opened with the stream archive");
    let p = wait(tabs, "close");
    tabs.activeTab.close();
    yield p;
};

exports['test open with livestreamer by default'] = function*(assert) {
    let channel = getChannel();
    channel.live = true;

    prefs.livestreamer_enabled = true;
    yield channelUtils.selectOrOpenTab(channel);
    assert.notEqual(tabs.activeTab.url, channel.url[0], "No tab opened with livestreamer as default");

    prefs.livestreamer_enabled = false;
};

require("sdk/test").run(exports);

