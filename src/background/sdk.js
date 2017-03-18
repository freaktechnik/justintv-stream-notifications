/**
 * SDK communication helper.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import { emit } from "../utils";
import EventTarget from 'event-target-shim';

class SDKCommunication extends EventTarget {
    constructor() {
        super();

        this.port = browser.runtime.connect({ name: "sdk-connection" });
        this.port.onMessage.addListener((message) => {
            emit(this, "message", message);
        });
    }

    postMessage(message) {
        if(typeof message != "object" || !("target" in message)) {
            throw new Error("Must at least give a target action for the message");
        }
        this.port.postMessage(message);
    }

    doAction(message) {
        return new Promise((resolve, reject) => {
            // Can't use the once infrastructure since other replies might come in first.
            const waitForAction = ({ detail }) => {
                if(detail.target == message.target + "-reply") {
                    this.removeEventListener("message", waitForAction, false);
                    if(!detail.error) {
                        resolve(detail.payload);
                    }
                    else {
                        reject(detail.error);
                    }
                }
            };
            this.addEventListener("message", waitForAction, false);
            this.postMessage(message);
        });
    }
}

const SDK = new SDKCommunication();

export default SDK;
