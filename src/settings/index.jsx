import 'file-loader?name=vendor/[name].[ext]!react/umd/react.production.min.js';
import 'file-loader?name=vendor/[name].[ext]!redux/dist/redux.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-dom/umd/react-dom.production.min.js';
import 'file-loader?name=vendor/[name].[ext]!react-redux/dist/react-redux.min.js';
// import 'file-loader?name=vendor/[name].[ext]!prop-types/prop-types.min.js';
// import 'file-loader?name=vendor/react-key-handler.[ext]!react-key-handler/dist/index.js';
// import 'file-loader?name=vendor/reselect.[ext]!reselect/dist/reselect.js';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducers from './reducers.js';
import '../content/shared.css';
import './settings.css';
import Settings from './components/settings.jsx';

const store = createStore(reducers);
//TODO intercept pref changes and store in storage
//TODO intercept channel/user mutations and send to bg page

ReactDOM.render(
    <Provider store={ store }>
        <React.StrictMode>
            <Settings/>
        </React.StrictMode>
    </Provider>,
    document.getElementById("root")
);
