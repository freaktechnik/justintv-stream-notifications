import {
    DEFAULT_SORT
} from './utils.js';
import { copy } from '../content/utils.js';
import {
    EXPLORE_TAB
} from './constants/tabs.json';
import storeTypes from './constants/store-types.json';
import SORT_FIELDS from './constants/sort.json';

export default (port) => ({
    getState, dispatch
}) => (next) => (action) => {
    const state = getState();

    // State based redirects of backend commands
    if("command" in action && action.command) {
        if(action.command === "explore" && state.ui.search && state.ui.query.length) {
            port.send("search", {
                type: action.payload,
                query: state.ui.query
            });
        }
        else if(action.command === "refresh" && state.ui.tab === EXPLORE_TAB) {
            if(state.ui.search && state.ui.query.length) {
                port.send("search", {
                    type: state.ui.currentProvider,
                    query: state.ui.query
                });
            }
            else {
                port.send("explore", state.ui.currentProvider);
            }
        }
        // Default backend commands
        else {
            port.send(action.command, action.payload);
        }
    }
    // State changes that trigger a backend command (i.e. everything that's wrong with this app)
    if("type" in action && action.type) {
        if(action.type === storeTypes.SET_TAB) {
            // This has to be aborted, else the loading state is set when payload === 3
            if(state.ui.tab === action.payload) {
                return;
            }
            else if(action.payload === EXPLORE_TAB) {
                if(!state.ui.search || !state.ui.query.length) {
                    port.send("explore", state.ui.currentProvider);
                }
                else {
                    port.send("search", {
                        type: state.ui.currentProvider,
                        query: state.ui.query
                    });
                }
            }
            if(!SORT_FIELDS[state.ui.sortField].tabs.includes(action.payload)) {
                dispatch({
                    type: storeTypes.SET_SORT_FIELD,
                    payload: DEFAULT_SORT
                });
            }
        }
        else if(action.type === storeTypes.SEARCH && state.ui.tab === EXPLORE_TAB) {
            if(action.payload.length) {
                port.send("search", {
                    type: state.ui.currentProvider,
                    query: action.payload
                });
            }
            else {
                port.send("explore", state.ui.currentProvider);
            }
            dispatch({
                type: storeTypes.LOADING
            });
        }
        else if(action.type === storeTypes.SET_FEATURED) {
            if((state.ui.search && ((state.ui.query.length && state.ui.query != action.payload.q) || !("q" in action.payload))) || state.ui.currentProvider != action.payload.type) {
                return;
            }
            action = {
                type: action.type,
                payload: action.payload.channels
            };
        }
        else if(action.type === storeTypes.TOGGLE_SEARCH && state.ui.search && state.ui.query.length && state.ui.tab === EXPLORE_TAB) {
            port.send("explore", state.ui.currentProvider);
            dispatch({
                type: storeTypes.LOADING
            });
        }
        else if(action.type === storeTypes.UPDATE_CHANNEL) {
            if(state.ui.tab !== EXPLORE_TAB && state.ui.loading && state.providers) {
                dispatch({
                    type: storeTypes.DONE_LOADING
                });
            }
        }
        else if(action.type === storeTypes.COPY) {
            copy(state.settings.copyPattern.replace("{URL}", action.payload.url)).then(() => {
                dispatch({
                    command: "copied",
                    payload: action.payload.uname
                });
            })
                .catch(console.error);
            return;
        }
        else if((action.type === storeTypes.ADD_CHANNELS || action.type === storeTypes.REMOVE_CHANNEL) && state.ui.tab !== EXPLORE_TAB && state.ui.loading && state.providers) {
            dispatch({
                type: storeTypes.DONE_LOADING
            });
        }

        // Finally your default middleware end and no more ugly hacks.
        return next(action);
    }
    return action;
};
