/**
 * Test youtube provider specific things
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { youtube } = requireHelper("../lib/providers").default;
const { getMockAPIQS, getMockQS } = require("./providers/mock-qs");

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

exports.testGetNoCategory = function*(assert) {
    const oldQS = youtube._qs;
    youtube._setQs(getMockQS(oldQS));

    const categoryName = yield youtube._getCategory('test');
    assert.equal(categoryName, "");

    youtube._setQs(oldQS);
};

require("sdk/test").run(exports);
