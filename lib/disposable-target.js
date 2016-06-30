/**
 * Disposable event target. Because I don't want to use SDK classes anymore.
 * Built as drop-in replacement for {@link external:sdk/core/disposable.Disposable}
 * with es6 classes.
 * @module disposable-target
 * @author Martin Giger
 * @license MPL-2.0
 */
 /**
 * An SDK class that handles unloading
 * @external sdk/core/disposable
 * @requires sdk/core/disposable
 */
/**
 * @class Disposable
 * @memberof external:sdk/core/disposable
 */
/* instanbul ignore */
"use strict";

import EventTarget from "./event-target";
import { setupDisposable, disposeDisposable, unload } from "sdk/core/disposable";
import { subscribe, unsubscribe, Observer, observe } from "sdk/core/observer";
import unloadSubject from "@loader/unload";

const unloadTopic = "sdk:loader:destroy";

const subscribers = new WeakMap();
const unloaded = new WeakSet();

/* istanbul ignore next */
/**
 * @class
 * @extends module:event-target.EventTarget
 */
class Disposable extends EventTarget {
    constructor(options) {
        super(options);
        setupDisposable(this);
    }

    destroy(reason) {
        disposeDisposable(this);
        unload(this, reason);
    }
}

unload.define(Disposable, (disposable, reason) => {
    if(!unloaded.has(disposable)) {
        unloaded.add(disposable);
        if(reason !== "shutdown")
            disposable.dispose();
    }
});

// Fix for older Fx versions (before 49, I believe)
subscribe.define(Disposable, (observer, topic) => {
    if(!subscribers.has(observer)) {
        subscribers.set(observer, new Observer());
    }
    subscribe(subscribers.get(observer), topic);
});

unsubscribe.define(Disposable, (observer, topic) => {
    if(subscribers.has(observer)) {
        unsubscribe(subscribers.get(observer), topic);
        subscribers.delete(observer);
    }
});

observe.define(Disposable, (obj, subject, topic, date) => {
    if(topic === unloadTopic && subject.wrappedJSObject === unloadSubject) {
        unsubscribe(obj, topic);
        unload(obj);
    }
});

export default Disposable;
