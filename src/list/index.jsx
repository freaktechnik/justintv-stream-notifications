import 'file-loader?name=vendor/[name].[ext]!react/dist/react.min.js';
import 'file-loader?name=vendor/[name].[ext]!redux/dist/redux.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-dom/dist/react-dom.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-redux/dist/react-redux.min.js';
import 'file-loader?name=vendor/[name].[ext]!prop-types/prop-types.min.js';
import 'file-loader?name=vendor/react-key-handler.[ext]!react-key-handler/dist/index.js';

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import reducers from './reducers';
import Popup from './components/popup.jsx';
import Port from '../port';
import ReadChannelList from '../read-channel-list';
import middlewareFactory from './middleware';
import prefs from '../preferences';
import '../content/shared.css';
import './list.css';

const PREFS_MAP = {
    copy_pattern: "setCopyPattern",
    theme: "theme",
    panel_extras: "setExtras",
    panel_style: "setStyle"
};

// Set up all the state stuff
const port = new Port("list", true),
    store = createStore(reducers, undefined, applyMiddleware(middlewareFactory(port))),
    list = new ReadChannelList();

store.subscribe(() => {
    document.body.className = store.getState().settings.theme;
});

port.send("ready");
const prefsKeys = Object.keys(PREFS_MAP);
prefs.get(prefsKeys).then((values) => {
    for(const i in values) {
        store.dispatch({
            type: PREFS_MAP[prefsKeys[i]],
            payload: values[i]
        });
    }
});
list.getChannelsByType().then((channels) => {
    store.dispatch({
        type: "addChannels",
        payload: channels
    });
});
port.addEventListener("message", ({ detail: event }) => {
    if(event.command === "addChannels") {
        Promise.all(event.payload.map((id) => list.getChannel(id))).then((channels) => {
            store.dispatch({
                type: "addChannels",
                payload: channels
            });
        });
    }
    else if(event.command === "updateChannel") {
        list.getChannel(event.payload).then((channel) => {
            store.dispatch({
                type: "updateChannel",
                payload: channel
            });
        });
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
prefs.addEventListener("change", ({ detail: { pref, value }}) => {
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

// Actually show something

render(
    <Provider store={ store }>
        <Popup/>
    </Provider>,
    document.getElementById("root")
);
