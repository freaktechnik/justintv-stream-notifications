import { combineReducers } from 'redux';

const THEMES = [
        "light",
        "dark"
    ],
    STYLES = [
        "compact",
        "default",
        "thumbnail"
    ],
    simpleReducer = (setter, defaultValue = false) => {
        return (state = defaultValue, event) => {
            switch(event.type) {
            case setter:
                return event.payload;
            default:
                return state;
            }
        };
    },
    theme = (state = THEMES[0], event) => {
        switch(event.type) {
        case "theme":
            return THEMES[event.payload];
        default:
            return state;
        }
    },
    style = (state = STYLES[1], event) => {
        switch(event.type) {
        case "setStyle":
            return STYLES[event.payload];
        default:
            return state;
        }
    },
    channels = (state = [], event) => {
        //TODO somehow channels are duplicating
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
                else {
                    return event.payload;
                }
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
        else if(event.type === "setTab" && event.payload === 3) {
            return true;
        }
        else {
            return state;
        }
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
        nonLiveDisplay: simpleReducer("setNonLiveDisplay", 0),
        extras: simpleReducer("setExtras"),
        queue,
        copyPattern: simpleReducer("setCopyPattern", '')
    }),
    ui = combineReducers({
        tab: simpleReducer("setTab", 0),
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
