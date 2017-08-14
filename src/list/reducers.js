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
    providers = (state = [], event) => {
        switch(event.command) {
        case "setProviders":
            return event.payload;
        default:
            return state;
        }
    },
    theme = (state = THEMES[0], event) => {
        switch(event.command) {
        case "theme":
            return THEMES[event.payload];
        default:
            return state;
        }
    },
    style = (state = STYLES[1], event) => {
        switch(event.command) {
        case "setStyle":
            return STYLES[event.payload];
        default:
            return state;
        }
    },
    nonLiveDisplay = (state = 1, event) => {
        switch(event.command) {
        case "setNonLiveDisplay":
            return event.payload;
        default:
            return state;
        }
    },
    extras = (state = false, event) => {
        switch(event.command) {
        case "setExtras":
            return event.payload;
        default:
            return state;
        }
    },
    queueStatus = (state = true, event) => {
        switch(event.command) {
        case "queueStatus":
            return event.payload;
        default:
            return state;
        }
    },
    queuePaused = (state = false, event) => {
        switch(event.command) {
        case "queuePaused":
            return event.payload;
        default:
            return state;
        }
    },
    featured = (state = [], event) => {
        switch(event.command) {
        case "setFeatured":
            return event.payload;
        default:
            return state;
        }
    },
    channels = (state = [], event) => {
        switch(event.command) {
        case "addChannels":
            return state.concat(event.payload);
        case "removeChannel":
            return state.filter((ch) => ch.id !== event.payload);
        case "channelUpdated":
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
    queue = combineReducers({
        status: queueStatus,
        paused: queuePaused
    }),
    settings = combineReducers({
        theme,
        style,
        nonLiveDisplay,
        extras,
        queue,
    }),
    handler = combineReducers({
        providers,
        settings,
        featured,
        channels
    });

export default handler;
