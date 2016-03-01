/**
 * Test youtube provider specific things
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const providers = requireHelper("../lib/providers");
const { getMockAPIQS } = require("./providers/mock-qs");

const youtube = providers.youtube;

exports.testGetChannelIDFallback = function*(assert) {
    const oldQS = youtube._qs;
    youtube._setQs(getMockAPIQS(oldQS, "youtube"));

    const channelId = "UCCbfB3cQtkEAiKfdRQnfQvw";
    const channel = yield youtube.getChannelDetails(channelId);
    assert.equal(channel.login, channelId, "Channel has the correct ID");
    assert.equal(channel.type, "youtube");
    assert.equal(channel.uname, "Jesse Cox");

    youtube._setQs(oldQS);
};

require("sdk/test").run(exports);
