import test from 'ava';
import reducer from '../../src/list/reducers.js';
import {
    LIVE_TAB,
    OFFLINE_TAB,
    EXPLORE_TAB
} from '../../src/list/constants/tabs.json';
import { DEFAULT_SORT } from '../../src/list/utils.js';
import prefs from '../../src/prefs.json';
import storeTypes from '../../src/list/constants/store-types.json';

test.after(() => {
    delete global.expect;
});

const getInitialState = () => ({
    providers: {},
    settings: {
        theme: 'light',
        style: 'default',
        nonLiveDisplay: parseInt(prefs.panel_nonlive.value, 10),
        extras: prefs.panel_extras.value,
        queue: {
            status: true,
            paused: false
        },
        copyPattern: prefs.copy_pattern.value,
        showMatureThumbs: prefs.show_mature_thumbs.value,
        openingMode: prefs.click_action.value
    },
    featured: [],
    channels: [],
    ui: {
        tab: LIVE_TAB,
        query: '',
        search: false,
        loading: true,
        currentProvider: 'twitch',
        contextChannel: null,
        queueContext: false,
        focusedContextItem: 0,
        showLivestreamer: false,
        focusedChannel: null,
        badges: prefs.panel_badges.value,
        sorting: false,
        sortField: DEFAULT_SORT,
        sortDirection: prefs.panel_sort_direction.value !== '0'
    }
});

test.beforeEach((t) => {
    t.context.initial = reducer(undefined, {});
});

test('initial state', (t) => {
    t.deepEqual(t.context.initial, getInitialState());
});

test('toggle search', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.TOGGLE_SEARCH
    });
    const expectedState = Object.assign({}, t.context.initial);
    expectedState.ui.search = true;
    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('toggle search off again', (t) => {
    t.context.initial.ui.search = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.TOGGLE_SEARCH
    });
    const expectedState = getInitialState();

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('toggle sort', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.TOGGLE_SORT
    });
    const expectedState = getInitialState();
    expectedState.ui.sorting = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('toggle sort off again', (t) => {
    t.context.initial.ui.sorting = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.TOGGLE_SORT
    });
    const expectedState = getInitialState();

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('set tab', (t) => {
    t.context.initial.ui.loading = false;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_TAB,
        payload: EXPLORE_TAB
    });
    const expectedState = getInitialState();
    expectedState.ui.tab = EXPLORE_TAB;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('set providers', (t) => {
    const providers = {
        foo: 'bar'
    };
    const newState = reducer(t.context.initial, {
        type: 'setProviders',
        payload: providers
    });
    const expectedState = getInitialState();
    expectedState.providers = providers;
    expectedState.ui.loading = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('set featured', (t) => {
    const featured = [
        'foo',
        'bar'
    ];
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_FEATURED,
        payload: featured
    });
    const expectedState = getInitialState();
    expectedState.featured = featured;
    expectedState.ui.loading = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('loading after featured', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_FEATURED,
        payload: 'foo'
    });
    const expectedState = getInitialState();
    expectedState.featured = 'foo';
    expectedState.ui.loading = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('loading', (t) => {
    t.context.initial.ui.loading = false;
    const newState = reducer(t.context.initial, {
        type: storeTypes.LOADING
    });
    const expectedState = getInitialState();

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('sort field', (t) => {
    const field = 'providers';
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_SORT_FIELD,
        payload: field
    });
    const expectedState = getInitialState();
    expectedState.ui.sortField = field;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('badges', (t) => {
    const newVal = !t.context.initial.ui.badges;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_BADGES,
        payload: newVal
    });
    const expectedState = getInitialState();
    expectedState.ui.badges = newVal;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('show livestreamer', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.HAS_STREAMLINK_HELPER,
        payload: true
    });
    const expectedState = getInitialState();
    expectedState.ui.showLivestreamer = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('current provider', (t) => {
    t.context.initial.ui.loading = false;
    const provider = 'youtube';
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_PROVIDER,
        payload: provider
    });
    const expectedState = getInitialState();
    expectedState.ui.currentProvider = provider;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('opening mode', (t) => {
    const newMode = 'livestreamer';
    const newState = reducer(t.context.initial, {
        type: storeTypes.OPENING_MODE,
        payload: newMode
    });
    const expectedState = getInitialState();
    expectedState.settings.openingMode = newMode;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('show mature thumbnails', (t) => {
    const newValue = !t.context.initial.settings.showMatureThumbs;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SHOW_MATURE_THUMBS,
        payload: newValue
    });
    const expectedState = getInitialState();
    expectedState.settings.showMatureThumbs = newValue;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('copy pattern', (t) => {
    const newPattern = 'test {URL} foo bar';
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_COPY_PATTERN,
        payload: newPattern
    });
    const expectedState = getInitialState();
    expectedState.settings.copyPattern = newPattern;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('queue status', (t) => {
    const newState = reducer(t.context.initial, {
        type: 'queueStatus',
        payload: false
    });
    const expectedState = getInitialState();
    expectedState.settings.queue.status = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('queue paused', (t) => {
    const newState = reducer(t.context.initial, {
        type: 'queuePaused',
        payload: true
    });
    const expectedState = getInitialState();
    expectedState.settings.queue.paused = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('extras', (t) => {
    const newValue = !t.context.initial.settings.extras;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_EXTRAS,
        payload: newValue
    });
    const expectedState = getInitialState();
    expectedState.settings.extras = newValue;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('non live display', (t) => {
    const newValue = '3';
    const newState = reducer(t.context.initial, {
        type: "setNonLiveDisplay",
        payload: newValue
    });
    const expectedState = getInitialState();
    expectedState.settings.nonLiveDisplay = newValue;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('loading doesnt change when setting tab to not explore', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_TAB,
        payload: OFFLINE_TAB
    });
    const expectedState = getInitialState();
    expectedState.ui.tab = OFFLINE_TAB;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('sort direction from settings to true', (t) => {
    t.context.initial.ui.sortDirection = false;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_SORT_DIRECTION,
        payload: '1'
    });
    const expectedState = getInitialState();
    expectedState.ui.sortDirection = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('sort direction from settings to false', (t) => {
    t.context.initial.ui.sortDirection = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_SORT_DIRECTION,
        payload: '0'
    });
    const expectedState = getInitialState();
    expectedState.ui.sortDirection = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('sort direction from ui to true', (t) => {
    t.context.initial.ui.sortDirection = false;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_SORT_DIRECTION,
        payload: true
    });
    const expectedState = getInitialState();
    expectedState.ui.sortDirection = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('sort direction from ui to false', (t) => {
    t.context.initial.ui.sortDirection = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.SET_SORT_DIRECTION,
        payload: false
    });
    const expectedState = getInitialState();
    expectedState.ui.sortDirection = false;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('queue context open', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.OPEN_QUEUE_CONTEXT
    });
    const expectedState = getInitialState();
    expectedState.ui.queueContext = true;

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('queue context close', (t) => {
    t.context.initial.ui.queueContext = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.CLOSE_CONTEXT
    });
    const expectedState = getInitialState();

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test.todo('focused channel');
test.todo('focused context item');
test.todo('context channel');
test.todo('channels');

test('set search query', (t) => {
    const newState = reducer(t.context.initial, {
        type: storeTypes.SEARCH,
        payload: 'foo'
    });
    const expectedState = getInitialState();
    expectedState.ui.query = 'foo';

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});

test('reset search query when search is hidden', (t) => {
    t.context.initial.ui.query = 'foo';
    t.context.initial.ui.search = true;
    const newState = reducer(t.context.initial, {
        type: storeTypes.TOGGLE_SEARCH
    });
    const expectedState = getInitialState();

    t.not(newState, t.context.initial);
    t.deepEqual(newState, expectedState);
});
