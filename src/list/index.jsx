import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducers from './reducers';
import Popup from './components/popup.jsx';
import Port from '../port';
import ReadChannelList from '../read-channel-list';
import './list.css';

const store = createStore(reducers),
    port = new Port("list", true),
    list = new ReadChannelList();

render(
    <Provider store={ store }>
        <Popup/>
    </Provider>,
    document.getElementById("root")
);

port.addEventListener("message", ({ detail: event }) => {
    if(event.command === "addChannels") {
        Promise.all(event.payload.map((id) => list.getChannel(id))).then((channels) => {
            store.dispatch({
                command: "addChannels",
                payload: channels
            });
        });
    }
    else {
        store.dispatch(event);
    }
}, {
    passive: true,
    capture: false
});

list.getChannelsByType().then((channels) => {
    store.dispatch({
        command: "addChannels",
        payload: channels
    });
});
