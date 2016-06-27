/**
 * Test twitch provider specific stuff
 * @author Martin Giger
 * @license MPL-2.0
 * @todo test playlist and hosting for all three methods
 * @todo test hosting preferred over playlist
 * @todo test hosting & playlist testchannels with the things disabled
 */
"use strict";

const requireHelper = require("./require_helper");
const { twitch: provider} = requireHelper("../lib/providers").default;
const { getMockAPIQS } = require("./providers/mock-qs");
const { when } = require("sdk/event/utils");
const { getChannel } = require("./channeluser/utils");
const LiveState = requireHelper("../lib/channel/live-state").default;

exports.testHostingToOffline1 = function*(assert) {
    // hosting endpoint is empty
    const originalQS = provider._qs;
    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    const hostingChannel = getChannel("test", "twitch");
    hostingChannel.live = new LiveState(LiveState.REDIRECT);

    const channel = yield provider._getHostedChannel(hostingChannel);
    assert.ok(!channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because there is no info on this channel");

    provider._setQs(originalQS);
};

exports.testHostingToOffline2 = function*(assert) {
    // hosting endpoint doesn't return a hosting target (not hosting)
    const originalQS = provider._qs;
    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    const hostingChannel = yield provider.updateChannel("freaktechnik");
    hostingChannel.live = new LiveState(LiveState.REDIRECT);

    const channel = yield provider._getHostedChannel(hostingChannel);
    assert.ok(!channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because it's not hosting anyone");

    provider._setQs(originalQS);
};

exports.testHostingToOffline3 = function*(assert) {
    // hosting but host target is offline
    const originalQS = provider._qs;
    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    const hostingChannel = getChannel('host-test', 'twitch');
    hostingChannel.live = new LiveState(LiveState.REDIRECT);
    hostingChannel.live.alternateUsername = "pyrionflax";

    const channel = yield provider._getHostedChannel(hostingChannel);
    assert.ok(!channel.live.isLive(LiveState.TOWARD_LIVE), "Channel is now marked as offline because the hosted channel is offline");

    provider._setQs(originalQS);
};

exports.testHosting = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    const ret = yield provider.updateChannel('pyrionflax');
    assert.ok(ret.live.state > LiveState.LIVE);
    assert.equal(ret.live.state, LiveState.REDIRECT);
    assert.equal(ret.live.alternateUsername, "NVIDIA");

    provider._setQs(originalQS);
};

exports.testPlaylist = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));

    const ret = yield provider.updateChannel('totalbiscuit');
    assert.equal(ret.title, "VOD title");
    assert.ok(ret.live.state > LiveState.LIVE);
    assert.equal(ret.live.state, LiveState.REBROADCAST);
    assert.equal(ret.category, "Gremlins, Inc.");

    provider._setQs(originalQS);
};

exports.testTwitchHostingRedirects = function*(assert) {
    const originalQS = provider._qs;

    provider._setQs(getMockAPIQS(originalQS, 'twitch'));
    const ret = yield provider.updateChannel('mlg_live');
    assert.equal(ret.login, 'mlg');
    assert.ok(!ret.live.isLive());

    provider._setQs(originalQS);
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
    assert.ok(ret[0].live.isLive());
    assert.equal(ret[0].id, 15);

    provider._setQs(originalQS);
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
    assert.ok(ret[0].live.isLive(), "Returned channel is live");
    assert.equal(ret[0].id, 15, "Returned channel still has its ID");

    provider._setQs(originalQS);
};

require("sdk/test").run(exports);
