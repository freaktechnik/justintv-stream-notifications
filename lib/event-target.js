/**
 * Drop-in replacement for {@link external:sdk/event/target.EventTarget} for use
 * with es6 classes.
 * @module event-target
 * @author Martin Giger
 * @license MPL-2.0
 */
 /**
 * An SDK class that add event reqistration methods
 * @external sdk/event/target
 * @requires sdk/event/target
 */
/**
 * @class EventTarget
 * @memberof external:sdk/event/target
 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/event_target#EventTarget}
 */
"use strict";

import { on, once, off, setListeners } from "sdk/event/core";

/**
 * @class
 */
export default class EventTarget {
    constructor(options) {
        setListeners(this, options);
    }

    on(...args) {
        on(this, ...args);
        return this;
    }

    once(...args) {
        once(this, ...args);
        return this;
    }

    off(...args) {
        off(this, ...args);
        return this;
    }

    removeListener(...args) {
        off(this, ...args);
        return this;
    }
}
