/**
 * Test provider events
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { EventSink } = requireHelper("../lib/providers/events");
const { when } = require("sdk/event/utils");
const providers = requireHelper("../lib/providers");
const { emit } = require("sdk/event/core");
const { getUser, getChannel } = require("./channeluser/utils");

exports.testUpdateUser = function*(assert) {
    const sink = new EventSink();
    let user, promise;

    for(let p in providers) {
        promise = when(sink, "updateuser");

        emit(providers[p], "updateuser", getUser('test', p));
        user = yield promise;
        assert.equal(user.login, 'test');
        assert.equal(user.type, p);
    }
};

exports.testUpdateChannels = function*(assert) {
    const sink = new EventSink();
    let channels, promise;

    for(let p in providers) {
        promise = when(sink, "updatedchannels");

        emit(providers[p], "updatedchannels", [ getChannel('test', p) ]);
        channels = yield promise;
        assert.equal(channels.length, 1);
        assert.equal(channels[0].login, 'test');
        assert.equal(channels[0].type, p);
    }
};

exports.testNewChannels = function*(assert) {
    const sink = new EventSink();
    let channels, promise;

    for(let p in providers) {
        promise = when(sink, "newchannels");

        emit(providers[p], "newchannels", [ getChannel('test', p) ]);
        channels = yield promise;
        assert.equal(channels.length, 1);
        assert.equal(channels[0].login, 'test');
        assert.equal(channels[0].type, p);
    }
};

require("sdk/test").run(exports);
