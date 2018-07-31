import test from 'ava';
import {
    CHANNEL_ACTIONS, getChannelAction, shouldClose
} from '../../../src/list/state/channel-actions';
import storeTypes from '../../../src/list/constants/store-types.json';

test('channel actions', (t) => {
    t.is(typeof CHANNEL_ACTIONS, 'object');
    const values = Array.from(Object.values(CHANNEL_ACTIONS));
    for(let i = 0; i < values.length; ++i) {
        t.true(values.includes(i));
    }

    t.true("OPEN" in CHANNEL_ACTIONS);
    t.true("ARCHIVE" in CHANNEL_ACTIONS);
    t.true("CHAT" in CHANNEL_ACTIONS);
    t.true("CONTEXT" in CHANNEL_ACTIONS);
    t.true("COPY" in CHANNEL_ACTIONS);
    t.true("LIVESTREAMER" in CHANNEL_ACTIONS);
});

const testGetChannelAction = (t, channel, action) => {
    const message = getChannelAction(CHANNEL_ACTIONS[action], channel);
    t.is(typeof message, 'object');
    t.true("payload" in message);

    if("type" in message) {
        const STATE_TYPES = Array.from(Object.values(storeTypes));
        t.true(STATE_TYPES.includes(message.type));
        if(action === 'CONTEXT') {
            t.is(message.payload, channel.id);
        }
        else {
            t.deepEqual(message.payload, channel);
        }
    }
    else {
        t.true("command" in message);
        if(channel.external) {
            if(action === "CHAT") {
                t.is(message.payload, channel.chatUrl);
            }
            else {
                t.is(message.payload, channel.url);
            }
        }
        else {
            t.is(message.payload, channel.id);
        }
    }
};
testGetChannelAction.title = (title, c, action) => `${title} ${action}`;

const testShouldClose = (t, action) => {
    if(action === "CONTEXT" || action === "COPY") {
        t.false(shouldClose(CHANNEL_ACTIONS[action], {}));
    }
    else {
        t.true(shouldClose(CHANNEL_ACTIONS[action], {}));
    }
};
testShouldClose.title = (title, action) => `${title} ${action}`;
{
    const channel = {
        id: 'foo',
        external: false
    };
    const externalChannel = {
        url: 'foo',
        chatUrl: 'bar',
        external: true
    };
    for(const action in CHANNEL_ACTIONS) {
        test('should close', testShouldClose, action);
        test('get message info', testGetChannelAction, channel, action);
        test('get message info external', testGetChannelAction, externalChannel, action);
    }
}
