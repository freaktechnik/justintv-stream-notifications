import { combineReducers } from 'redux';
import prefs from '../prefs.json';
import {
    EXPLORE_TAB,
    LIVE_TAB
} from './constants/tabs.json';
import storeTypes from './constants/store-types.json';
import { DEFAULT_SORT } from './utils.js';

const THEMES = [
        "light",
        "dark"
    ],
    STYLES = [
        "compact",
        "default",
        "thumbnail"
    ],
    DEFAULT_THEME = parseInt(prefs.theme.value, 10),
    DEFAULT_STYLE = parseInt(prefs.panel_style.value, 10),
    DEFAULT_NONLIVE = parseInt(prefs.panel_nonlive.value, 10),
    DEFAULT_TAB = LIVE_TAB,
    DEFAULT_SELECTED = 0,
    DEFAULT_SORT_DIRECTION = prefs.panel_sort_direction.value !== '0',
    ONE_ITEM = 1,
    simpleReducer = (setter, defaultValue = false) => (state = defaultValue, event) => {
        switch(event.type) {
        case setter:
            return event.payload;
        default:
            return state;
        }
    },
    theme = (state = THEMES[DEFAULT_THEME], event) => {
        switch(event.type) {
        case storeTypes.SET_THEME:
            return THEMES[event.payload];
        default:
            return state;
        }
    },
    style = (state = STYLES[DEFAULT_STYLE], event) => {
        switch(event.type) {
        case storeTypes.SET_STYLE:
            return STYLES[event.payload];
        default:
            return state;
        }
    },
    channels = (state = [], event) => {
        switch(event.type) {
        case storeTypes.ADD_CHANNELS: {
            const newState = state.slice();
            const currIds = newState.map((s) => s.id);
            for(const newChan of event.payload) {
                // If the ID already exists, treat this as an update.
                if(currIds.includes(newChan.id)) {
                    newState.splice(currIds.indexOf(newChan.id), ONE_ITEM, newChan);
                }
                else {
                    newState.push(newChan);
                }
            }
            return newState;
        }
        case storeTypes.REMOVE_CHANNEL:
            return state.filter((ch) => ch.id !== event.payload);
        case storeTypes.UPDATE_CHANNEL:
            return state.map((ch) => {
                if(ch.id !== event.payload.id) {
                    return ch;
                }

                return event.payload;
            });
        default:
            return state;
        }
    },
    loading = (state = true, event) => {
        if(event.type === storeTypes.SET_FEATURED) {
            return false;
        }
        else if(event.type === 'setProviders') {
            return false;
        }
        else if(event.type === storeTypes.LOADING) {
            return true;
        }
        else if(event.type === storeTypes.SET_PROVIDER) {
            return true;
        }
        else if(event.type === storeTypes.SET_TAB && event.payload === EXPLORE_TAB) {
            return true;
        }
        else if(event.type === storeTypes.DONE_LOADING) {
            return false;
        }

        return state;
    },
    query = (state = "", event) => {
        switch(event.type) {
        case storeTypes.SEARCH:
            return event.payload;
        case storeTypes.TOGGLE_SEARCH:
            if(state.length) {
                return "";
            }
        default:
            return state;
        }
    },
    search = (state = false, event) => {
        switch(event.type) {
        case storeTypes.TOGGLE_SEARCH:
            return !state;
        default:
            return state;
        }
    },
    contextChannel = (state = null, event) => {
        switch(event.type) {
        case storeTypes.SET_CONTEXT_CHANNEL:
            return event.payload;
        case storeTypes.CLOSE_CONTEXT:
            return null;
        default:
            return state;
        }
    },
    queueContext = (state = false, event) => {
        switch(event.type) {
        case storeTypes.OPEN_QUEUE_CONTEXT:
            return true;
        case storeTypes.CLOSE_CONTEXT:
            return false;
        default:
            return state;
        }
    },
    focusedContextItem = (state = DEFAULT_SELECTED, event) => {
        switch(event.type) {
        case storeTypes.SET_CONTEXT_FOCUS:
            return event.payload;
        case storeTypes.OPEN_QUEUE_CONTEXT:
        case storeTypes.CLOSE_CONTEXT:
        case storeTypes.SET_CONTEXT_CHANNEL:
            return DEFAULT_SELECTED;
        default:
            return state;
        }
    },
    focusedChannel = (state = null, event) => {
        switch(event.type) {
        case storeTypes.SET_FOCUSED_CHANNEL:
            return event.payload;
        case storeTypes.SET_TAB:
        case storeTypes.LOADING:
            return null;
        default:
            return state;
        }
    },
    sorting = (state = false, event) => {
        switch(event.type) {
        case storeTypes.TOGGLE_SORT:
            return !state;
        default:
            return state;
        }
    },
    sortDirection = (state = DEFAULT_SORT_DIRECTION, event) => {
        switch(event.type) {
        case storeTypes.SET_SORT_DIRECTION:
            return event.payload && event.payload !== '0';
        default:
            return state;
        }
    },
    queue = combineReducers({
        status: simpleReducer("queueStatus", true),
        paused: simpleReducer("queuePaused")
    }),
    settings = combineReducers({
        theme,
        style,
        nonLiveDisplay: simpleReducer("setNonLiveDisplay", DEFAULT_NONLIVE),
        extras: simpleReducer(storeTypes.SET_EXTRAS, prefs.panel_extras.value),
        queue,
        copyPattern: simpleReducer(storeTypes.SET_COPY_PATTERN, prefs.copy_pattern.value),
        showMatureThumbs: simpleReducer(storeTypes.SHOW_MATURE_THUMBS, prefs.show_mature_thumbs.value),
        openingMode: simpleReducer(storeTypes.OPENING_MODE, prefs.click_action.value)
    }),
    ui = combineReducers({
        tab: simpleReducer(storeTypes.SET_TAB, DEFAULT_TAB),
        query,
        search,
        loading,
        currentProvider: simpleReducer(storeTypes.SET_PROVIDER, 'twitch'),
        contextChannel,
        queueContext,
        focusedContextItem,
        showLivestreamer: simpleReducer(storeTypes.HAS_STREAMLINK_HELPER, false),
        focusedChannel,
        badges: simpleReducer(storeTypes.SET_BADGES, prefs.panel_badges.value),
        sorting,
        sortField: simpleReducer(storeTypes.SET_SORT_FIELD, DEFAULT_SORT),
        sortDirection
    }),
    handler = combineReducers({
        providers: simpleReducer("setProviders", {}),
        settings,
        featured: simpleReducer(storeTypes.SET_FEATURED, []),
        channels,
        ui
    });

export default handler;
