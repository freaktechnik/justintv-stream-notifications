/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { once } = require("sdk/event/core"),
    { setImmediate, setTimeout } = require("sdk/timers");

const expectReject = (p) => {
    return p.then((...args) => {
        throw args;
    }, (e) => e);
};
exports.expectReject = expectReject;

/* From the Add-on SDK tests: https://github.com/mozilla/addon-sdk/blob/master/test/event/helpers.js */
/**
 * Utility function that returns a promise once the specified event's `type`
 * is emitted on the given `target`, or the delay specified is passed.
 *
 * @param {Object|number} [target] - The delay to wait, or the object that
 *                                   receives the event. If not given, the
 *                                   function returns a promise that will be
 *                                   resolved as soon as possible.
 * @param {string} [type] - A string representing the event type to waiting for.
 * @param {boolean} [capture] - If `true`, `capture` indicates that the user
 *                              wishes to initiate capture.
 * @async
 * @returns {?} A promise resolved once the delay given is passed, or the object
 *          receives the event specified.
 */
const wait = (target, type, capture) => {
    return new Promise((resolve, reject) => {
        if(!target) {
            setImmediate(resolve);
        }
        else if(typeof (target) === "number") {
            setTimeout(resolve, target);
        }
        else if(typeof (target.once) === "function") {
            target.once(type, resolve);
        }
        else if(typeof (target.addEventListener) === "function") {
            target.addEventListener(type, function listener(...args) {
                target.removeEventListener(type, listener, capture);
                resolve(...args);
            }, capture);
        }
        else if(typeof (target) === "object" && target !== null) {
            once(target, type, resolve);
        }
        else {
            reject('Invalid target given.');
        }
    });
};
exports.wait = wait;

