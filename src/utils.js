/**
 * Concurrency utils for events.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

export const when = (target, event) => {
    if(target instanceof EventTarget) {
        return new Promise((resolve) => {
            target.addEventListener(event, resolve, {
                once: true,
                capture: false
            });
        });
    }
    else if("on" + event[0].toUpperCase() + event.substr(1) in target) {
        return new Promise((resolve) => {
            const property = "on" + event[0].toUpperCase() + event.substr(1),
                listener = (e) => {
                    target[property].removeListener(listener);
                    resolve(e);
                };
            target[property].addListener(listener);
        });
    }
    return Promise.resolve();
};

/**
 * Emits an event on an EventTarget.
 *
 * @param {external:EventTarget} target - Target to dispatch the event on.
 * @param {string} event - Type of the event.
 * @param {?} detail - One or more details. Multiple details will be passed in
 *                     an array as the detail property of the event.
 * @returns {boolean} If the event fully propagated.
 */
export const emit = (target, event, ...detail) => {
    let eventInstance;
    const init = {
        cancelable: true
    };
    if(detail.length) {
        if(detail.length == 1) {
            init.detail = detail[0];
        }
        else {
            init.detail = detail;
        }
        eventInstance = new CustomEvent(event, init);
    }
    else {
        eventInstance = new Event(event, init);
    }
    return target.dispatchEvent(eventInstance);
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
            return fn(...args);
        }
    };
};

/**
 * Filter an array based on a condition that is returned as promise.
 * Like Array.prototype.filter, just that it takes a promise from the callback
 * instead of a boolean.
 *
 * @param {Array} array - Array to filter.
 * @param {Function} callback - Callback to filter on. Should return a promise.
 * @returns {Array} Array filtered based on the result of the callback.
 */
export const filterAsync = async (array, callback) => {
    const predicates = await Promise.all(array.map(callback));
    return array.filter((a, i) => predicates[i]);
};

/**
 * Pipe an event from one target to another.
 *
 * @param {module:event-target.EventTarget} source - Object emitting the event.
 * @param {string} event - Event to pipe through.
 * @param {module:event-target.EventTarget} target - Target to pipe to.
 * @returns {undefined}
 */
export const pipe = (source, event, target) => {
    source.addEventListener(event, (e) => target.dispatchEvent(e), { passive: true });
};
