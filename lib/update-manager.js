/**
 * UpdateManager unifies status, control and events of multiple update methods,
 * including queues for polling and socket streams.
 * @module update-manager
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { EventTarget } = require("sdk/event/target");
const { emit, setListeners } = require("sdk/event/core");
const { Disposable } = require("sdk/core/disposable");

const qs = require("./queue/service");
const wss = require("./websocket/service");

const models = new WeakMap();
const modelFor = mgr => models.get(mgr);

/**
 * @event module:update-manager~UpdateManager#paused
 */
/**
 * @event module:update-manager~UpdateManager#resumed
 */

const UpdateManager = newClass(
/** @lends module:update-manger~UpdateManager.prototype */
{
    extends: EventTarget,
    implements: [
        Disposable
    ],
    /**
     * @constructs
     * @extends external:sdk/event/target.EventTarget
     * @implements external:sdk/core/disposable.Disposable
     */
    setup(options) {
        setListeners(options);

        models.set(this, {
            paused: () => emit(this, "pause"),
            resumed: () => emit(this, "resume"),
        });

        // Let's send those ourselves and pretend only we can send them?
        //qs.addQueueListeners(modelFor(this));
    },
    dispose() {
        //qs.removeQueueListeners(modelFor(this));

        models.delete(this);
    },
    /**
     * @fires module:update-manager~UpdateManager#paused
     */
    pause() {
        qs.pause();
        wss.pause();
        modelFor(this).paused();
    },
    /**
     * @fires module:update-manager~UpdateManager#resumed
     */
    resume() {
        qs.resume();
        wss.resume();
        modelFor(this).resumed();
    }
});

module.exports = new UpdateManager();
