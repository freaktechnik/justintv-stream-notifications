/**
 * Provides an object that emits an event whenever one of the providers emits an event
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/events
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { setListeners } = require("sdk/event/core");
const { pipe } = require("sdk/event/utils");
const providers = require("./index");

const EventSink = newClass(
/** @lends module:providers/events.EventSink.prototype */
{
    extends: EventTarget,
    /**
     * @constructs
     * @fires module:providers/generic-provider.GenericProvider#updateduser
     * @fires module:providers/generic-provider.GenericProvider#updatedchannels
     * @fires module:providers/generic-provider.GenericProvider#newchannels
     * @argument {Object.<string, function>} [options] - Event listener object
     * @extends external:sdk/event/target.EventTarget
     */
    initialize: function(options) {
        setListeners(this, options);
        for(let p in providers) {
            pipe(providers[p], this);
        }
    }
});

exports.EventSink = EventSink;
