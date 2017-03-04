/**
 * Test the {@link module:channel/live-state} module.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import LiveState from "../../../src/background/channel/live-state";

test('exports', (t) => {
    t.true("deserialize" in LiveState, "deserialize is in LiveState");
    t.is(typeof LiveState.deserialize, "function", "The exported deserialize property is a function");
    t.true("OFFLINE" in LiveState, "LiveState has the OFFLINE constant");
    t.true("LIVE" in LiveState, "LiveState has the LIVE constant");
    t.true("REDIRECT" in LiveState, "LiveState has the REDIRECT constant");
    t.true("REBROADCAST" in LiveState, "LiveState has the REBROADCAST constant");
    t.true("TOWARD_LIVE" in LiveState, "LiveState has the TOWARD_LIVE constant");
    t.true("TOWARD_OFFLINE" in LiveState, "LiveState has the TOWARD_OFFLINE constant");
});

test('Construction', (t) => {
    let state = new LiveState();
    t.is(state.state, LiveState.OFFLINE, "Default value for the construction sets the state to offline");

    state = new LiveState(LiveState.OFFLINE);
    t.is(state.state, LiveState.OFFLINE, "Constructing with live sets the state to offline");

    state = new LiveState(LiveState.LIVE);
    t.is(state.state, LiveState.LIVE, "Constructing with live sets the state to live");

    state = new LiveState(LiveState.REDIRECT);
    t.is(state.state, LiveState.REDIRECT, "Constructing with redirect sets the state to redirect");

    state = new LiveState(LiveState.REBROADCAST);
    t.is(state.state, LiveState.REBROADCAST, "Constructing with rebroadcast sets the state to rebroadcast");
});

test('Serialize', (t) => {
    const expectedResult = {
            state: LiveState.OFFLINE,
            alternateUsername: "",
            alternateURL: ""
        },
        state = new LiveState(),
        serialized = state.serialize();

    t.deepEqual(serialized, expectedResult, "The serialized object matches the expected structure");
    t.is(JSON.stringify(serialized), JSON.stringify(expectedResult), "Stringified objects are equal");
});

test('Deserialize', (t) => {
    const serialized = {
            state: LiveState.REDIRECT,
            alternateUsername: "test",
            alternateURL: "https://example.com/test"
        },
        state = LiveState.deserialize(serialized);

    t.is(state.state, serialized.state, "State was correctly deserialized");
    t.is(state.alternateUsername, serialized.alternateUsername, "alternate username was correctly deserialized");
    t.is(state.alternateURL, serialized.alternateURL, "alternate URL was correctly deserialized");
    t.deepEqual(state.serialize(), serialized, "Serializing the deserialized object holds the same result");
});

test('isLive', (t) => {
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

    return Promise.all(statesToTest.map(async (testState) => {
        const state = new LiveState(testState.value);

        t.is(await state.isLive(LiveState.TOWARD_LIVE), testState[LiveState.TOWARD_LIVE], testState.name + " is treated correctly TOWARD_LIVE");
        t.is(await state.isLive(LiveState.TOWARD_OFFLINE), testState[LiveState.TOWARD_OFFLINE], testState.name + " is treated correctly TOWARD_OFFLINE");
    }));
});

test('defaultInterpretation', async (t) => {
    browser.storage.local.get.withArgs("panel_nonlive").returns(Promise.resolve({
        "panel_nonlive": 2
    }));
    t.is(await LiveState.defaultInterpretation(), LiveState.TOWARD_LIVE);

    browser.storage.local.get.withArgs("panel_nonlive").returns(Promise.resolve({
        "panel_nonlive": 3
    }));
    t.is(await LiveState.defaultInterpretation(), LiveState.TOWARD_OFFLINE);
});

test.todo('isLive default param value');

test('setLive', (t) => {
    const state = new LiveState();

    state.setLive(true);
    t.is(state.state, LiveState.LIVE, "Setting an offline state live makes it live");

    state.setLive(false);
    t.is(state.state, LiveState.OFFLINE, "Setting a live state offline makes it offline");
});
