/**
 * Test twitch provider specific stuff
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test livestate for playlist and hosed
 * @todo test playlist tile
 */
"use strict";

const requireHelper = require("./require_helper");
const providers = requireHelper("../lib/providers");
const { getMockAPIQS } = require("./providers/mock-qs");
const { when } = require("sdk/event/utils");
const { getChannel } = require("./channeluser/utils");

const provider = providers.twitch;

exports.testTwitchHostingRedirects = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    const ret = yield provider.updateChannel('mlg_live');
    assert.equal(ret.login, 'mlg');
    assert.ok(!ret.live);
};

exports.testTwitchLiveRedirects = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    const channel = getChannel('mlg_live', 'twitch', 15);
    channel.uname = "MLG";
    const ret = yield provider.updateChannels([
        channel
    ]);
    assert.equal(ret.length, 1);
    assert.equal(ret[0].login, 'mlg');
    assert.ok(ret[0].live);
    assert.equal(ret[0].id, 15);
};

exports.testTwitchUpdateRedirects = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    yield provider._getChannelId({
        login:'mlg_live'
    });

    const prom = when(provider, "updatedchannels");
    const channel = getChannel('mlg_live', 'twitch', 15);
    channel.uname = "MLG";
    provider.updateRequest([
        channel
    ]);
    const ret = yield prom;

    assert.equal(ret.length, 1, "Update returns the channel");
    assert.equal(ret[0].login, 'mlg', "Returned channel has the updated login");
    assert.ok(ret[0].live, "Returned channel is live");
    assert.equal(ret[0].id, 15, "Returned channel still has its ID");
};

require("sdk/test").run(exports);
