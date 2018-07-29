import test from 'ava';
import {
    getExternalID, formatChannel, getFieldValue
} from '../../src/list/utils';
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
            language: 'en',
            extras: {
                category: 'baz',
                viewers: 1,
                provider: 'Test',
                liveSince: undefined
            },
            thumbnail: 'lorem',
            showExtras: false,
            showTitle: true,
            showThumbnail: false,
            showState: true
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
                state: LiveState.LIVE,
                created: 2
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
                provider: 'Test',
                liveSince: 2
            },
            url: 'https://example.com',
            language: '',
            thumbnail: 'lorem',
            showExtras: true,
            showThumbnail: false,
            showTitle: true,
            showState: true
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
                provider: 'Twitch',
                category: 'baz'
            },
            url: 'https://example.com',
            language: undefined,
            title: 'ipsum',
            thumbnail: 'lorem',
            showExtras: true,
            showTitle: false,
            showThumbnail: false,
            showState: false
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
            language: '',
            extras: {
                provider: 'Test',
                category: 'baz',
                viewers: 2,
                liveSince: undefined
            },
            title: 'ipsum',
            thumbnail: 'lorem',
            showExtras: false,
            showTitle: false,
            showThumbnail: false,
            showState: false
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
            language: '',
            extras: {
                provider: 'Test',
                category: 'baz',
                viewers: 2,
                liveSince: undefined
            },
            title: 'ipsum',
            thumbnail: 'lorem',
            showExtras: false,
            showTitle: false,
            showThumbnail: false,
            showState: false
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
            language: '',
            title: 'ipsum',
            thumbnail: 'lorem',
            extras: {
                provider: 'Test',
                category: 'baz'
            },
            showTitle: false,
            showThumbnail: false,
            showExtras: false,
            showState: false
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
            language: '',
            extras: {
                provider: 'Test',
                category: 'baz',
                viewers: 1,
                liveSince: undefined
            },
            showThumbnail: true,
            showTitle: true,
            showExtras: false,
            showState: true
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
            language: '',
            extras: {
                provider: 'Test',
                category: 'baz',
                viewers: 1,
                liveSince: undefined
            },
            thumbnail: 'lorem',
            showTitle: true,
            showThumbnail: false,
            showExtras: false,
            showState: true
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

const TEST_OBJ = {
    foo: 'bar',
    baz: {
        lorem: 'ipsum',
        dolor: {
            sit: 'amet'
        }
    }
};
const TEST_PATHS = [
    {
        path: 'foo',
        value: TEST_OBJ.foo
    },
    {
        path: 'baz.lorem',
        value: TEST_OBJ.baz.lorem
    },
    {
        path: 'baz.dolor.sit',
        value: TEST_OBJ.baz.dolor.sit
    },
    {
        path: 'baz.dolor',
        value: TEST_OBJ.baz.dolor
    }
];
const testGetFieldValue = (t, obj, p) => {
    const val = getFieldValue(obj, p.path);
    t.is(val, p.value);
};
testGetFieldValue.title = (t, obj, p) => `${t}: ${p.path}`;

for(const p of TEST_PATHS) {
    test('getFieldValue', testGetFieldValue, TEST_OBJ, p);
}
