/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 */

//TODO reactivate once e10s is reliable

const tabs = require("sdk/tabs");
let   channelUtils = require('../lib/channel-utils');
var { setTimeout } = require("sdk/timers");
const { wait } = require("./event/helpers");
var { getChannel } = require("./channeluser/utils");

exports['test open or focus tab'] = function*(assert) {
    var channel = getChannel();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");
    tabs.open({url: "http://example.com"});

    let tabToClose = yield wait(tabs, "ready");

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "activate");

    tabToClose.close();

    assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");
    channel.live = true;

    tabs.open({url: "http://example.com"});
    tabToClose = yield wait(tabs, "ready");

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "activate");

    assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");

    tabToClose.close();
    tabs.activeTab.close();

    channelUtils.selectOrOpenTab(channel);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem");
    tabs.activeTab.close();

    channelUtils.selectOrOpenTab(channel, true);
    yield wait(tabs, "ready");

    assert.equal(tabs.activeTab.url, "http://www.foo.bar/lorem/archive");
    tabs.activeTab.close();
};

require("sdk/test").run(exports);

