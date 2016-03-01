/**
 * Test twitch provider specific stuff
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const providers = requireHelper("../lib/providers");
const { getMockAPIQS } = require("./providers/mock-qs");
const { when } = require("sdk/event/utils");

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
    const ret = yield provider.updateChannels([
        {
            login: 'mlg_live',
            uname: 'MLG',
            id: 15
        }
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
    provider.updateRequest([
        {
            login: 'mlg_live',
            uname: 'MLG',
            id: 15
        }
    ]);
    const ret = yield prom;

    assert.equal(ret.length, 1, "Update returns the channel");
    assert.equal(ret[0].login, 'mlg', "Returned channel has the updated login");
    assert.ok(ret[0].live, "Returned channel is live");
    assert.equal(ret[0].id, 15, "Returned channel still has its ID");
};

require("sdk/test").run(exports);
