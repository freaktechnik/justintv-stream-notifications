/**
 * Test the {@link module:channel/live-state} module.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import LiveState from "../../../src/background/channel/live-state";
import prefs from '../../../src/prefs.json';
import { getChannel } from '../../helpers/channel-user';
import sinon from 'sinon';

test('exports', (t) => {
    t.true("deserialize" in LiveState, "deserialize is in LiveState");
    t.is(typeof LiveState.deserialize, "function", "The exported deserialize property is a function");
    t.true("OFFLINE" in LiveState, "LiveState has the OFFLINE constant");
    t.true("LIVE" in LiveState, "LiveState has the LIVE constant");
    t.true("REDIRECT" in LiveState, "LiveState has the REDIRECT constant");
    t.true("REBROADCAST" in LiveState, "LiveState has the REBROADCAST constant");
    t.true("TOWARD_LIVE" in LiveState, "LiveState has the TOWARD_LIVE constant");
    t.true("TOWARD_OFFLINE" in LiveState, "LiveState has the TOWARD_OFFLINE constant");
    t.true("TOWARD_BROADCASTING" in LiveState, "LiveState has the TOWARD_BROADCASTING constant");
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

test.serial('Serialize', (t) => {
    const c = sinon.useFakeTimers();
    const expectedResult = {
            state: LiveState.OFFLINE,
            alternateChannel: undefined,
            created: Date.now()
        },
        state = new LiveState(),
        serialized = state.serialize();

    t.deepEqual(serialized, expectedResult, "The serialized object matches the expected structure");
    t.is(JSON.stringify(serialized), JSON.stringify(expectedResult), "Stringified objects are equal");

    c.restore();
});

test.serial('Deserialize', (t) => {
    const c = sinon.useFakeTimers();
    const serialized = {
            state: LiveState.REDIRECT,
            alternateChannel: {
                login: "test",
                uname: "test",
                urls: [ "https://example.com/test" ]
            },
            created: Date.now()
        },
        state = LiveState.deserialize(serialized);

    t.is(state.state, serialized.state, "State was correctly deserialized");
    t.deepEqual(state.alternateChannel, serialized.alternateChannel, "alternate username was correctly deserialized");
    t.deepEqual(state.serialize(), serialized, "Serializing the deserialized object holds the same result");

    c.restore();
});

const statesToTest = [
    {
        name: "offline",
        value: LiveState.OFFLINE,
        [LiveState.TOWARD_LIVE]: false,
        [LiveState.TOWARD_OFFLINE]: false,
        [LiveState.TOWARD_BROADCASTING]: false
    },
    {
        name: "live",
        value: LiveState.LIVE,
        [LiveState.TOWARD_LIVE]: true,
        [LiveState.TOWARD_OFFLINE]: true,
        [LiveState.TOWARD_BROADCASTING]: true
    },
    {
        name: "redirect",
        value: LiveState.REDIRECT,
        [LiveState.TOWARD_LIVE]: true,
        [LiveState.TOWARD_OFFLINE]: false,
        [LiveState.TOWARD_BROADCASTING]: false
    },
    {
        name: "rebroadcast",
        value: LiveState.REBROADCAST,
        [LiveState.TOWARD_LIVE]: true,
        [LiveState.TOWARD_OFFLINE]: false,
        [LiveState.TOWARD_BROADCASTING]: true
    }
];
const testStates = async (t, testState) => {
    const state = new LiveState(testState.value);

    t.is(await state.isLive(LiveState.TOWARD_LIVE), testState[LiveState.TOWARD_LIVE], "correctly treated TOWARD_LIVE");
    t.is(await state.isLive(LiveState.TOWARD_OFFLINE), testState[LiveState.TOWARD_OFFLINE], "correctly treated TOWARD_OFFLINE");
    t.is(await state.isLive(LiveState.TOWARD_BROADCASTING), testState[LiveState.TOWARD_BROADCASTING], "correctly treated TOWARD_BROADCASTING");
    t.is(await state.isLive("asdf"), false);
};
testStates.title = (title, state) => `${title} for ${state.name}`;

for(const testState of statesToTest) {
    test('isLive', testStates, testState);
}

const testDefaultInterpretation = async (t, i, interpretation) => {
    browser.storage.local.get.withArgs({ "panel_nonlive": prefs.panel_nonlive.value }).resolves({
        "panel_nonlive": i
    });
    t.is(await LiveState.defaultInterpretation(), interpretation);

    browser.storage.local.get.reset();
    browser.storage.local.get.callsFake((props) => Promise.resolve(props));
};
test.defaultInterpretation = (title, i, state) => `${title} with ${i} intepreted as ${state}`;
const expectedStates = [
    LiveState.TOWARD_LIVE,
    LiveState.TOWARD_LIVE,
    LiveState.TOWARD_OFFLINE
];
for(const i in expectedStates) {
    test.serial('defaultInterpretation', testDefaultInterpretation, i, expectedStates[i]);
}

test.todo('isLive default param value');

test('setLive', (t) => {
    const state = new LiveState();

    state.setLive(true);
    t.is(state.state, LiveState.LIVE, "Setting an offline state live makes it live");

    state.setLive(false);
    t.is(state.state, LiveState.OFFLINE, "Setting a live state offline makes it offline");
});

test('redirectTo', (t) => {
    const state = new LiveState(),
        channel = getChannel();
    state.redirectTo(channel);

    t.is(state.state, LiveState.REDIRECT);
    t.deepEqual(state.alternateChannel, channel.serialize());
    t.is(state.alternateUsername, channel.uname);
    t.is(state.alternateURL, channel.url[0]);
});

test('alternate properties', (t) => {
    const state = new LiveState();
    t.is(state.alternateChannel, undefined);
    t.is(state.alternateUsername, '');
    t.is(state.alternateURL, '');
});
