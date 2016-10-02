/**
 * Concurrent logic utils
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

/**
 * Identity function, returns what it gets.
 *
 * @param {?} i - What it gets.
 * @returns {?} What it got.
 */
const identity = (i) => i;

/**
 * An asynchronous version of the boolean and operation.
 *
 * @param {Promise} args - Promises that return booleans to do an and on.
 * @async
 * @returns {boolean} Result of the and operation on all returned values.
 */
export function and(...args) {
    return Promise.all(args).then((p) => p.every(i));
};

/**
 * An asynchronous version of the boolean or operation.
 *
 * @param {Promise} args - Promises that return booleans to do an or on.
 * @async
 * @returns {boolean} Result of the or operation on all returned values.
 */
export function or(...args) {
    return Promise.all(args).then((p) => p.some(i));
};

/*
 * Invert the value a promise resolves to.
 *
 * @param {Promise} promsie - Promise that returns the value to invert.
 * @async
 * @returns {boolean} The opposite value than the given promise resolved to.
 */
export function not(promise) {
    return promise.then((p) => !p);
};
