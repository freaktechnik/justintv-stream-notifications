import { combineReducers } from 'redux';
import prefs from '../prefs.json';
import { EXTRAS_TAB, LIVE_TAB } from './constants/tabs.json';

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
        case "theme":
            return THEMES[event.payload];
        default:
            return state;
        }
    },
    style = (state = STYLES[DEFAULT_STYLE], event) => {
        switch(event.type) {
        case "setStyle":
            return STYLES[event.payload];
        default:
            return state;
        }
    },
    channels = (state = [], event) => {
        switch(event.type) {
        case "addChannels":
            return state.concat(event.payload);
        case "removeChannel":
            return state.filter((ch) => ch.id !== event.payload);
        case "updateChannel":
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
    loading = (state = false, event) => {
        if(event.type === "setFeatured") {
            return false;
        }
        else if(event.type === "loading") {
            return true;
        }
        else if(event.type === "setProvider") {
            return true;
        }
        else if(event.type === "setTab" && event.payload === EXTRAS_TAB) {
            return true;
        }

        return state;
    },
    query = (state = "", event) => {
        switch(event.type) {
        case "search":
            return event.payload;
        case "toggleSearch":
            if(state.length) {
                return "";
            }
        default:
            return state;
        }
    },
    search = (state = false, event) => {
        switch(event.type) {
        case "toggleSearch":
            return !state;
        default:
            return state;
        }
    },
    contextChannel = (state = null, event) => {
        switch(event.type) {
        case "setContextChannel":
            return event.payload;
        case "closeContext":
            return null;
        default:
            return state;
        }
    },
    queueContext = (state = false, event) => {
        switch(event.type) {
        case "openQueueContext":
            return true;
        case "closeContext":
            return false;
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
        extras: simpleReducer("setExtras"),
        queue,
        copyPattern: simpleReducer("setCopyPattern", '')
    }),
    ui = combineReducers({
        tab: simpleReducer("setTab", DEFAULT_TAB),
        query,
        search,
        loading,
        currentProvider: simpleReducer("setProvider", 'twitch'),
        contextChannel,
        queueContext
    }),
    handler = combineReducers({
        providers: simpleReducer("setProviders", {}),
        settings,
        featured: simpleReducer("setFeatured", []),
        channels,
        ui
    });

export default handler;
