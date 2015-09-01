/**
 * Provides an object that emits an event whenever one of the providers emits an event
 * @author Martin Giger
 * @license MPL-2.0
 * @module provider-events
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { setListeners } = require("sdk/event/core");
const { pipe } = require("sdk/event/utils");
const providers = require("./providers");

const EventSink = newClass({
    extends: EventTarget,
    initialize: function(options) {
        setListeners(this, options);
        for(let p in providers) {
            pipe(providers[p], this);
        }
    }
});

exports.EventSink = EventSink;
