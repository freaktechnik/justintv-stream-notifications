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
import EventTarget from "./event-target";
import { setupDisposable, disposeDisposable, unload } from "sdk/core/disposable";

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
        if(reason !== "shutdown") {
            disposable.dispose(reason);
        }
    }
});

export default Disposable;
