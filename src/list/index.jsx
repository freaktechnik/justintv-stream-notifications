import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducers from './reducers';
import Popup from './components/popup.jsx';

const store = createStore(reducers);

render(
    <Provider store={ store }>
        <Popup/>
    </Provider>,
    document.getElementById("root");
)
