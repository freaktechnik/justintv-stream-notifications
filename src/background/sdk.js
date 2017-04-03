/**
 * SDK communication helper.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import { pipe } from "../utils";
import EventTarget from 'event-target-shim';
import Port from '../port';

class SDKCommunication extends EventTarget {
    constructor() {
        super();

        this.port = new Port("sdk-connection", true);
        pipe(this.port, "message", this);
    }

    postMessage(command, payload) {
        this.port.send(command, payload);
    }

    doAction(command, payload) {
        return this.port.request(command, payload);
    }
}

const SDK = new SDKCommunication();

export default SDK;
