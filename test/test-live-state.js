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
    assert.ok("DISABLED" in LiveState, "LiveState has the DISABLED constant");
    assert.ok("REDIRECT" in LiveState, "LiveState has the REDIRECT constant");
    assert.ok("REBROADCAST" in LiveState, "LiveState has the REBROADCAST constant");
};

exports.testConstruction = (assert) => {
    let state = new LiveState();
    assert.equal(state.state, LiveState.DISABLED, "Default value for the construction sets the state to disabled");

    state = new LiveState(LiveState.DISABLED);
    assert.equal(state.state, LiveState.DISABLED, "Constructing with disabled sets the state to disabled");

    state = new LiveState(LiveState.REDIRECT);
    assert.equal(state.state, LiveState.REDIRECT, "Constructing with redirect sets the state to redirect");

    state = new LiveState(LiveState.REBROADCAST);
    assert.equal(state.state, LiveState.REBROADCAST, "Constructing with rebroadcast sets the state to rebroadcast");
};

exports.testEnabled = (assert) => {
    let state = new LiveState(LiveState.DISABLED);
    assert.ok(!state.enabled, "Disabled means it is disabled");

    state = new LiveState(LiveState.REDIRECT);
    assert.ok(state.enabled, "Redirect means it is enabled");

    state = new LiveState(LiveState.REBROADCAST);
    assert.ok(state.enabled, "Rebroadcast means it is enabled");
};

exports.testDisable = (assert)  => {
    let state = new LiveState(LiveState.REDIRECT);
    state.disable();
    assert.ok(!state.enabled, "Disabling redirect makes it not enabled");
    assert.equal(state.state, LiveState.DISABLED, "Disabling redirect changes the state to disabled");

    state = new LiveState(LiveState.REBROADCAST);
    state.disable();
    assert.ok(!state.enabled, "Disabling rebroadcast makes it not enabled");
    assert.equal(state.state, LiveState.DISABLED, "Disabling rebroadcast changes the state to disabled");

    state.disable();
    assert.ok(!state.enabled, "Disabling again leaves it disabled");
    assert.equal(state.state, LiveState.DISABLED, "Disabling again leaves the state as disabled");
};

exports.testSerialize = (assert) => {
    const expectedResult = {
        state: LiveState.DISABLED,
        enabled: false,
        alternateUsername: "",
        alternateURL: ""
    };

    const state = new LiveState();
    const serialized = state.serialize();

    assert.deepEqual(serialized, expectedResult, "The serialized object matches the expected structure");
    assert.equal(JSON.stringify(serialized), JSON.stringify(expectedResult), "Stringified objects are equal");
};

exports.testDeserialize = (assert) => {
    const serialized = {
        state: LiveState.REDIRECT,
        enabled: true,
        alternateUsername: "test",
        alternateURL: "https://example.com/test"
    };

    const state = LiveState.deserialize(serialized);

    assert.equal(state.state, serialized.state, "State was correctly deserialized");
    assert.equal(state.alternateUsername, serialized.alternateUsername, "alternate username was correctly deserialized");
    assert.equal(state.alternateURL, serialized.alternateURL, "alternate URL was correctly deserialized");
    assert.deepEqual(state.serialize(), serialized, "Serializing the deserialized object holds the same result");
};

require("sdk/test").run(exports);
