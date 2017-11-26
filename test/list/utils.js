import test from 'ava';
import { getExternalID, formatChannel } from '../../src/list/utils';
import LiveState from '../../src/live-state.json';

test('getExternalID', (t) => {
    t.is(getExternalID({
        login: 'foo',
        type: 'bar'
    }), 'foo|bar');
});

const providers = {
    test: {
        enabled: false,
        name: 'Test'
    },
    twitch: {
        enabled: true,
        name: 'Twitch'
    }
};

const channelFormats = [
    {
        extras: false,
        type: 0,
        style: "default",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.REBROADCAST
            },
            category: 'baz',
            viewers: 1,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 7,
            chatUrl: 'https://example.com/chat',
            url: [ 'https://example.com' ],
            login: 'foo',
            language: 'en'
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.REBROADCAST,
            imageSize: 30,
            hasChat: true,
            providerEnabled: false,
            tooltip: 'foo - "ipsum"',
            title: 'ipsum',
            id: 7,
            external: false,
            url: 'https://example.com',
            language: 'en'
        }
    },
    {
        extras: true,
        type: 0,
        style: "default",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.LIVE
            },
            category: 'baz',
            viewers: 1,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 7,
            chatUrl: 'https://example.com/chat',
            url: [ 'https://example.com' ],
            login: 'foo',
            language: ''
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.LIVE,
            imageSize: 30,
            hasChat: true,
            providerEnabled: false,
            tooltip: 'foo - "ipsum"',
            title: 'ipsum',
            id: 7,
            external: false,
            extras: {
                category: 'baz',
                viewers: 1,
                provider: 'Test'
            },
            url: 'https://example.com',
            language: ''
        }
    },
    {
        extras: true,
        type: 2,
        style: "default",
        channel: {
            uname: 'foo',
            type: 'twitch',
            image: 'bar',
            live: {
                state: LiveState.OFFLINE
            },
            category: 'baz',
            viewers: 0,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 6,
            url: [ 'https://example.com' ],
            login: 'foo',
            language: undefined
        },
        formattedChannel: {
            uname: 'foo',
            type: 'twitch',
            image: 'bar',
            liveState: LiveState.OFFLINE,
            imageSize: 30,
            hasChat: false,
            providerEnabled: true,
            tooltip: 'foo',
            id: 6,
            external: false,
            extras: {
                provider: 'Twitch'
            },
            url: 'https://example.com',
            language: undefined
        }
    },
    {
        extras: false,
        type: 2,
        style: "default",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.REBROADCAST
            },
            category: 'baz',
            viewers: 2,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 5,
            url: [ 'https://example.com' ],
            login: 'foo',
            language: ''
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.REBROADCAST,
            imageSize: 30,
            hasChat: false,
            providerEnabled: false,
            tooltip: 'foo',
            id: 5,
            external: false,
            url: 'https://example.com',
            language: ''
        }
    },
    {
        extras: false,
        type: 2,
        style: "compact",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.REDIRECT
            },
            category: 'baz',
            viewers: 2,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 5,
            url: [ 'https://example.com' ],
            login: 'foo',
            language: ''
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.REDIRECT,
            imageSize: 12,
            hasChat: false,
            providerEnabled: false,
            tooltip: 'foo',
            id: 5,
            external: false,
            url: 'https://example.com',
            language: ''
        }
    },
    {
        extras: false,
        type: 2,
        style: "thumbnail",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            chatUrl: '',
            live: {
                state: LiveState.OFFLINE
            },
            category: 'baz',
            viewers: 0,
            thumbnail: 'lorem',
            title: 'ipsum',
            url: [ 'https://example.com' ],
            login: 'foo',
            language: ''
        },
        formattedChannel: {
            chatUrl: '',
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.OFFLINE,
            imageSize: 30,
            hasChat: false,
            providerEnabled: false,
            tooltip: 'foo',
            id: 'foo|test',
            external: true,
            url: 'https://example.com',
            language: ''
        }
    },
    {
        extras: false,
        type: 0,
        style: "thumbnail",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.REBROADCAST
            },
            category: 'baz',
            viewers: 1,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 7,
            chatUrl: 'https://example.com/chat',
            url: [ 'https://example.com' ],
            login: 'foo',
            language: ''
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.REBROADCAST,
            imageSize: 30,
            hasChat: true,
            providerEnabled: false,
            tooltip: 'foo - "ipsum"',
            title: 'ipsum',
            id: 7,
            external: false,
            thumbnail: 'lorem',
            url: 'https://example.com',
            language: ''
        }
    },
    {
        extras: false,
        type: 0,
        style: "default",
        channel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            live: {
                state: LiveState.REDIRECT
            },
            category: 'baz',
            viewers: 1,
            thumbnail: 'lorem',
            title: 'ipsum',
            id: 7,
            chatUrl: 'https://example.com/chat',
            url: [ 'https://example.com' ],
            login: 'foo',
            redirectors: [ {
                uname: 'a',
                image: 'b',
                id: 'c',
                login: 'd'
            } ],
            language: ''
        },
        formattedChannel: {
            uname: 'foo',
            type: 'test',
            image: 'bar',
            liveState: LiveState.REDIRECT,
            imageSize: 30,
            hasChat: true,
            providerEnabled: false,
            tooltip: 'foo - "ipsum"',
            title: 'ipsum',
            id: 7,
            external: false,
            redirectors: [ {
                uname: 'a',
                image: 'b',
                id: 'c'
            } ],
            url: 'https://example.com',
            language: ''
        }
    }
];

const testFormatChannel = (t, info, providers) => {
    const result = formatChannel(info.channel, providers, info.type, info.extras, info.style);
    t.deepEqual(result, info.formattedChannel);
    t.false("redirectors" in info.channel, "Side effect of formatChannel");
};
testFormatChannel.title = (title, info) => `${title}: ${info.type},${info.style},${info.extras} - ${info.channel.login}`;

for(const info of channelFormats) {
    test('formatChannel', testFormatChannel, info, providers);
}

test.todo('formatChannel default params');
