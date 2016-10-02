/**
 * Concurrency utils for events.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

export const when = (target, event) => {
    if(target instanceof EventTarget) {
        return new Promsie((resolve, reject) => {
            target.addEventListener(event, resolve, {
                once: true,
                capture: false
            });
        });
    }
    else if("on" + event[0].toUpperCase() + event.substr(1) in target) {
        return new Promise((resolve, reject) => {
            const property = "on" + event[0].toUpperCase() + event.substr(1),
                listener = (e) => {
                    target[property].removeListener(listener);
                    resolve(e);
                };
            target[property].addListener(listener);
        });
    }
};

export const emit = (target, event, ...detail) => {
    if(detail.length) {
        if(detail.length == 1) {
            detail = detail[0];
        }
        target.dispatchEvent(new CustomEvent(event, { detail }));
    }
    else {
        target.dispatchEvent(new Event(event));
    }
};

/**
 * So this is a magic function. It makes things work by being kind of a reversed
 * once. But let me explain: this function will only execute the function if it
 * is the most recently registered one. The first argument has to be an unique
 * id, which is used to check if the callback is the most recent one.
 * This is used to avoid race conditions with DB callbacks when channels are
 * deleted.
 *
 * @param {*} newId - An id for this new callback.
 * @param {Function} fn - Needs to be the same callback to work.
 * @returns {Function} Function that is "debounced".
 */
export const invokeOnce = (newId, fn) => {
    fn.currentId = newId;
    return function(...args) {
        if(fn.currentId == newId) {
            delete fn.currentId;
            fn(...args);
        }
    };
};

/**
 * Filter an array based on a condition that is returned as promise. Like
 * Array.prototype.filter, just that it takes a promise from the callback
 * isntead of a boolean.
 *
 * @param {Array} array - Array to filter
 * @param {Function} callback - Callback to filter on. Should return a promise.
 * @returns {Array} Array filtered based on the result of the callback.
 */
export const filterAsync = async (array, callback) => {
    const predicates = await Promise.all(array.map(callback));
    return array.filter((a, i) => predicates[i]);
};

