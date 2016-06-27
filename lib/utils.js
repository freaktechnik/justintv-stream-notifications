/**
 * Random util functions that aren't specific to anything, other than JS.
 * @author Martin Giger
 * @license MPL-2.0
 * @module utils
 */
"use strict";

const { Task } = require("resource://gre/modules/Task.jsm");

/**
 * So this is a magic function. It makes things work by being kind of a reversed
 * once. But let me explain:
 * This function will only execute the function if it is the most recently
 * registered one. The first argument has to be an unique
 * ID, which is used to check if the callback is the most recent one.
 * This is used to avoid race conditions with DB callbacks when channels are
 * deleted.
 * @argument {*} newId - An id for this new callback
 * @argument {function} fn - Needs to be the same callback to work.
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

export const { async } = Task;
