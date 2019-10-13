import { combineReducers } from 'redux';
import storeTypes from './store-types.json';

const DEFAULT_TAB = 0;

const main = combineReducers({
    tab: (state = DEFAULT_TAB, event) => {
        if(event.type === storeTypes.TAB_SELECT) {
            return event.payload;
        }
        return state;
    },
    channels: (state = [], event) => {
        if(event.type === storeTypes.SET_CHANNELS) {
            return event.payload;
        }
        //TODO incremental updates
        return state;
    },
    users: (state = [], event) => {
        if(event.type === storeTypes.SET_USERS) {
            return event.payload;
        }
        //TODO incremental updates
        return state;
    }//,
    // selected,
    // searchTerm,
    // options
});

export default main;
