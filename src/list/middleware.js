export default (port) => ({ getState, dispatch }) => (next) => (action) => {
    const state = getState();

    // State based redirects of backend commands
    if(action.command === "explore" && state.ui.search && state.ui.query.length) {
        port.send("search", {
            type: action.payload,
            query: state.ui.query
        });
    }
    else if(action.command === "refresh" && state.ui.tab === 3) {
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
    else if(action.command) {
        port.send(action.command, action.payload);
    }
    // State changes that trigger a backend command
    else if(action.type === "setTab" && action.payload === 3) {
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
    else if(action.type === "search" && action.payload.length && state.ui.tab === 3) {
        port.send("search", {
            type: state.ui.currentProvider,
            query: action.payload
        });
        dispatch({
            type: "loading"
        });
    }
    else if(action.type === "setFeatured") {
        if((state.ui.search && state.ui.query != action.payload.q) || state.ui.currentProvider != action.payload.type) {
            return;
        }
        action = {
            type: action.type,
            payload: action.payload.channels
        };
    }
    else if(action.type === "toggleSearch" && state.ui.search) {
        port.send("explore", state.ui.currentProvider);
        dispatch({
            type: "loading"
        });
    }

    if(action.type) {
        return next(action);
    }
    return action;
};
