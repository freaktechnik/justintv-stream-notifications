import { combineReducers } from 'redux';
import storeTypes from './store-types.json';
import prefs from '../prefs.json';

const DEFAULT_TAB = 0;

const simpleReducer = (setter, defaultValue = false) => (state = defaultValue, event) => {
        switch(event.type) {
        case setter:
            return event.payload;
        default:
            return state;
        }
    },
    makePrefsReducers = () => {
        const reducers = {};
        for(const pref in prefs) {
            if(prefs.hasOwnProperty(pref)) {
                reducers[pref] = simpleReducer(pref, prefs[pref].value);
            }
        }
        return reducers;
    },
    main = combineReducers({
        tab: (state = DEFAULT_TAB, event) => { //TODO shared base reducer for the two?
            if(event.type === storeTypes.TAB_SELECT) {
                return event.payload;
            }
            return state;
        },
        channels: (state = [], event) => { //TODO share with list?
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
        },
        // selected,
        // searchTerm,
        options: combineReducers(makePrefsReducers())
    });

export default main;
