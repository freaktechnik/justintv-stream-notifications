/**
 * Provides an object that emits an event whenever one of the providers emits an event
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/events
 */
"use strict";

import EventTarget from "../event-target";
import { pipe } from "sdk/event/utils";
import providers from "./index";

/**
 * @class module:providers/events.EventSink
 * @extends module:event-target.EventTarget
 */
export default class EventSink extends EventTarget {
    /**
     * @constructs
     * @fires module:providers/generic-provider.GenericProvider#updateduser
     * @fires module:providers/generic-provider.GenericProvider#updatedchannels
     * @fires module:providers/generic-provider.GenericProvider#newchannels
     * @argument {Object.<string, function>} [options] - Event listener object
     */
    constructor(options) {
        super(options);
        for(let p in providers) {
            pipe(providers[p], this);
        }
    }
}
