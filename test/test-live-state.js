/**
 * Test the {@link module:channel/live-state} module.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { LiveState } = requireHelper("../lib/channel/live-state");

exports.testExports = (assert) => {
    assert.ok("deserialize" in LiveState, "deserialize is in LiveState");
    assert.equal(typeof LiveState.deserialize, "function", "The exported deserialize property is a function");
    assert.ok("OFFLINE" in LiveState, "LiveState has the OFFLINE constant");
    assert.ok("LIVE" in LiveState, "LiveState has the LIVE constant");
    assert.ok("REDIRECT" in LiveState, "LiveState has the REDIRECT constant");
    assert.ok("REBROADCAST" in LiveState, "LiveState has the REBROADCAST constant");
    assert.ok("TOWARD_LIVE" in LiveState, "LiveState has the TOWARD_LIVE constant");
    assert.ok("TOWARD_OFFLINE" in LiveState, "LiveState has the TOWARD_OFFLINE constant");
};

exports.testConstruction = (assert) => {
    let state = new LiveState();
    assert.equal(state.state, LiveState.OFFLINE, "Default value for the construction sets the state to offline");

    state = new LiveState(LiveState.OFFLINE);
    assert.equal(state.state, LiveState.OFFLINE, "Constructing with live sets the state to offline");

    state = new LiveState(LiveState.LIVE);
    assert.equal(state.state, LiveState.LIVE, "Constructing with live sets the state to live");

    state = new LiveState(LiveState.REDIRECT);
    assert.equal(state.state, LiveState.REDIRECT, "Constructing with redirect sets the state to redirect");

    state = new LiveState(LiveState.REBROADCAST);
    assert.equal(state.state, LiveState.REBROADCAST, "Constructing with rebroadcast sets the state to rebroadcast");
};

exports.testSerialize = (assert) => {
    const expectedResult = {
        state: LiveState.OFFLINE,
        alternateUsername: "",
        alternateURL: "",
        isLive: false
    };

    const state = new LiveState();
    const serialized = state.serialize();

    assert.deepEqual(serialized, expectedResult, "The serialized object matches the expected structure");
    assert.equal(JSON.stringify(serialized), JSON.stringify(expectedResult), "Stringified objects are equal");
};

exports.testDeserialize = (assert) => {
    const serialized = {
        state: LiveState.REDIRECT,
        alternateUsername: "test",
        alternateURL: "https://example.com/test",
        isLive: true
    };

    const state = LiveState.deserialize(serialized);

    assert.equal(state.state, serialized.state, "State was correctly deserialized");
    assert.equal(state.alternateUsername, serialized.alternateUsername, "alternate username was correctly deserialized");
    assert.equal(state.alternateURL, serialized.alternateURL, "alternate URL was correctly deserialized");
    assert.deepEqual(state.serialize(), serialized, "Serializing the deserialized object holds the same result");
};

exports.testIsLive = (assert) => {
    const statesToTest = [
        {
            name: "offline",
            value: LiveState.OFFLINE,
            [LiveState.TOWARD_LIVE]: false,
            [LiveState.TOWARD_OFFLINE]: false
        },
        {
            name: "live",
            value: LiveState.LIVE,
            [LiveState.TOWARD_LIVE]: true,
            [LiveState.TOWARD_OFFLINE]: true
        },
        {
            name: "redirect",
            value: LiveState.REDIRECT,
            [LiveState.TOWARD_LIVE]: true,
            [LiveState.TOWARD_OFFLINE]: false
        },
        {
            name: "rebroadcast",
            value: LiveState.REBROADCAST,
            [LiveState.TOWARD_LIVE]: true,
            [LiveState.TOWARD_OFFLINE]: false
        }
    ];

    for(let testState of statesToTest) {
        let state = new LiveState(testState.value);

        assert.equal(state.isLive(LiveState.TOWARD_LIVE), testState[LiveState.TOWARD_LIVE], testState.name+" is treated correctly TOWARD_LIVE");
        assert.equal(state.isLive(LiveState.TOWARD_OFFLINE), testState[LiveState.TOWARD_OFFLINE], testState.name+" is treated correctly TOWARD_OFFLINE");
    }
};

exports.testSetLive = (assert) => {
    let state = new LiveState();

    state.setLive(true);
    assert.equal(state.state, LiveState.LIVE, "Setting an offline state live makes it live");

    state.setLive(false);
    assert.equal(state.state, LiveState.OFFLINE, "Setting a live state offline makes it offline");
};

require("sdk/test").run(exports);
