/**
 * Concurrency utils for events.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

const FIRST = 0,
    REST = 1,
    capitalize = /*#__PURE__*/ (str) => str[FIRST].toUpperCase() + str.substr(REST),
    getEventPropertyName = /*#__PURE__*/ (event) => `on${capitalize(event)}`;

export { capitalize };

/* eslint-disable promise/avoid-new */
export const when = /*#__PURE__*/ (target, event) => {
    if(target instanceof EventTarget) {
        return new Promise((resolve) => {
            target.addEventListener(event, resolve, {
                once: true,
                capture: false
            });
        });
    }
    else if(getEventPropertyName(event) in target) {
        return new Promise((resolve) => {
            const property = getEventPropertyName(event),
                listener = (e) => {
                    target[property].removeListener(listener);
                    resolve(e);
                };
            target[property].addListener(listener);
        });
    }
    return Promise.resolve();
};
/* eslint-enable promise/avoid-new */

/**
 * Emits an event on an EventTarget.
 *
 * @param {external:EventTarget} target - Target to dispatch the event on.
 * @param {string} event - Type of the event.
 * @param {?} detail - One or more details. Multiple details will be passed in
 *                     an array as the detail property of the event.
 * @returns {boolean} If the event fully propagated.
 */
export const emit = /*#__PURE__*/ (target, event, ...detail) => {
    let eventInstance;
    const init = {
        cancelable: true
    };
    if(detail.length) {
        if(detail.length === REST) {
            init.detail = detail.pop();
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
 * Pipe an event from one target to another.
 *
 * @param {module:event-target.EventTarget} source - Object emitting the event.
 * @param {string} event - Event to pipe through.
 * @param {module:event-target.EventTarget} target - Target to pipe to.
 * @returns {undefined}
 */
export const pipe = /*#__PURE__*/ (source, event, target) => {
    source.addEventListener(event, (e) => emit(target, event, e.detail), { passive: true });
};
