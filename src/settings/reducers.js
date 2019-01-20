import { combineReducers } from 'redux';
import storeTypes from './store-types.json';

const DEFAULT_TAB = 0;

const main = combineReducers({
    tab: (state = DEFAULT_TAB, event) => {
        if(event.type === storeTypes.TAB_SELECT) {
            return event.payload;
        }
        return state;
    }
});

export default main;
