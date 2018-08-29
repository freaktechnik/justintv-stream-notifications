import 'file-loader?name=vendor/[name].[ext]!react/umd/react.production.min.js';
import 'file-loader?name=vendor/[name].[ext]!redux/dist/redux.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-dom/umd/react-dom.production.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-redux/dist/react-redux.min.js';
import 'file-loader?name=vendor/[name].[ext]!prop-types/prop-types.min.js';
import 'file-loader?name=vendor/react-key-handler.[ext]!react-key-handler/dist/index.js';
import 'file-loader?name=vendor/reselect.[ext]!reselect/dist/reselect.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import {
    createStore,
    applyMiddleware
} from 'redux';
import reducers from './reducers.js';
import Popup from './components/popup.jsx';
import Port from '../port.js';
import ReadChannelList from '../read-channel-list.js';
import middlewareFactory from './middleware.js';
import prefs from '../preferences.js';
import storeTypes from './constants/store-types.json';
import { hasStreamlink } from '../features.js';
import '../content/shared.css';
import './list.css';

const PREFS_MAP = {
        'copy_pattern': storeTypes.SET_COPY_PATTERN,
        theme: storeTypes.SET_THEME,
        'panel_extras': storeTypes.SET_EXTRAS,
        'panel_style': storeTypes.SET_STYLE,
        'show_mature_thumbs': storeTypes.SHOW_MATURE_THUMBS,
        'click_action': storeTypes.OPENING_MODE,
        'panel_badges': storeTypes.SET_BADGES,
        'panel_sort_field': storeTypes.SET_SORT_FIELD,
        'panel_sort_direction': storeTypes.SET_SORT_DIRECTION
    },
    prefsKeys = Object.keys(PREFS_MAP),
    // Set up all the state stuff
    port = new Port("list", true),
    store = createStore(reducers, undefined, applyMiddleware(middlewareFactory(port))),
    list = new ReadChannelList();

store.subscribe(() => {
    document.body.className = store.getState().settings.theme;
});

port.send("ready");
Promise.all([
    prefs.get(prefsKeys).then((values) => {
        for(const i in values) {
            store.dispatch({
                type: PREFS_MAP[prefsKeys[i]],
                payload: values[i]
            });
        }
    }),
    list.getChannelsByType().then((channels) => {
        store.dispatch({
            type: storeTypes.ADD_CHANNELS,
            payload: channels
        });
    })
]).catch(console.error);
port.addEventListener("message", ({ detail: event }) => {
    if(event.command === "addChannels") {
        Promise.all(event.payload.map((id) => list.getChannel(id)))
            .then((channels) => {
                store.dispatch({
                    type: storeTypes.ADD_CHANNELS,
                    payload: channels
                });
            })
            .catch(console.error);
    }
    else if(event.command === "updateChannel") {
        list.getChannel(event.payload)
            .then((channel) => {
                store.dispatch({
                    type: storeTypes.UPDATE_CHANNEL,
                    payload: channel
                });
            })
            .catch(console.error);
    }
    else {
        store.dispatch({
            type: event.command,
            payload: event.payload
        });
    }
}, {
    passive: true,
    capture: false
});
prefs.addEventListener("change", ({ detail: {
    pref, value
} }) => {
    if(pref in PREFS_MAP) {
        store.dispatch({
            command: PREFS_MAP[pref],
            payload: value
        });
    }
}, {
    passive: true,
    capture: false
});

document.documentElement.setAttribute("lang", browser.i18n.getUILanguage().replace("_", "-"));

hasStreamlink()
    .then((streamlinkAvailable) => {
        store.dispatch({
            type: storeTypes.HAS_STREAMLINK_HELPER,
            payload: streamlinkAvailable
        });
    })
    .catch(console.error);

// Actually show something

ReactDOM.render(
    <Provider store={ store }>
        <React.StrictMode>
            <Popup/>
        </React.StrictMode>
    </Provider>,
    document.getElementById("root")
);
