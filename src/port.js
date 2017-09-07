/**
 * Abstracts command-based port communication.
 *
 * @license MPL-2.0
 * @author Martin Giger
 */

import EventTarget from "event-target-shim";
import { emit, when } from "./utils.js";

export class NoPortError extends Error {
    constructor() {
        super("No open port");
    }
}

export class PortGoneError extends Error {
    constructor() {
        super("Port disconnected");
    }
}

class PortWrapper extends EventTarget {
    static get REPLY_SUFFIX() {
        return "-reply";
    }

    constructor(port) {
        super();

        if(port) {
            this.name = port.name;
            this.setup(port);
        }
    }

    /**
     * Sets up listeners on the port instance.
     *
     * @param {external:browser.runtime.Port} port - Port to connect with.
     * @returns {undefined}
     */
    setup(port) {
        this.port = port;
        this.port.onMessage.addListener((message) => {
            let e = true;
            if(message.command != "message") {
                e = emit(this, message.command, message);
            }
            if(e) {
                emit(this, "message", message);
            }
        });
        this.disconnectPromise = new Promise((r, reject) => {
            this.port.onDisconnect.addListener(() => {
                reject(new PortGoneError());
                this.port = undefined;
                emit(this, "disconnect");
            });
        });
    }

    /**
     * Sends a message on the port. By default attaches the data as payload.
     *
     * @param {string} command - Command to send.
     * @param {?} [payload] - Payload to send with the command.
     * @param {string} [property='payload'] - Property to send the payload in.
     * @returns {undefined}
     */
    send(command, payload, property = 'payload') {
        this.port.postMessage({
            command,
            [property]: payload
        });
    }

    /**
     * Replies to a command.
     *
     * @param {string} command - Command to reply to.
     * @param {?} [payload] - Payload to send with the reply.
     * @returns {undefined}
     */
    reply(command, payload) {
        this.send(command + PortWrapper.REPLY_SUFFIX, payload);
    }

    /**
     * Replies to a command with an error.
     *
     * @param {string} command - Command to reply to.
     * @param {?} error - Error to reply with.
     * @returns {undefined}
     */
    replyError(command, error) {
        this.send(command + PortWrapper.REPLY_SUFFIX, error, 'error');
    }

    /**
     * Requests a response to a command.
     *
     * @async
     * @param {string} command - Command to send.
     * @param {?} [payload] - Payload to send along with the request.
     * @throws {?} With the other side's error.
     * @throws {PortGoneError} If the port disconnects before a reply arrives.
     * @returns {?} Response from the other side.
     */
    request(command, payload) {
        const promise = when(this, command + PortWrapper.REPLY_SUFFIX);
        this.send(command, payload);
        return Promise.race([
            promise.then(({ detail }) => {
                if("error" in detail) {
                    throw detail.error;
                }
                else {
                    return detail.payload;
                }
            }),
            this.disconnectPromise
        ]);
    }
}

/**
 * Unified two-way command and response protocol for Ports.
 *
 * @extends PortWrapper
 */
export default class Port extends PortWrapper {
    /**
     * @param {string} portName - Name of the port to interact with.
     * @param {boolean} [open=false] - If a port should be opened. Else the class
     *        listens for ports to be opened and interacts with new ports.
     */
    constructor(portName, open = false) {
        super();
        this.name = portName;

        if(open) {
            const port = browser.runtime.connect({ name: this.name });
            this.setup(port);
        }
        else {
            browser.runtime.onConnect.addListener((port) => {
                if(port.name == this.name) {
                    if(!this.port) {
                        this.setup(port);
                    }
                    else {
                        emit(this, "duplicate", new PortWrapper(port));
                    }
                }
            });
        }
    }

    /**
     * Sets up listeners on the port instance.
     *
     * @param {external:browser.runtime.Port} port - Port to connect to.
     * @fires Port#connect
     * @returns {undefined}
     */
    setup(port) {
        super.setup(port);
        emit(this, "connect", this.port);
    }

    /**
     * Sends a message on the port. By default attaches the data as payload. Noop
     * if no port is connected.
     *
     * @param {string} command - Command to send.
     * @param {?} [payload] - Payload to send with the command.
     * @param {string} [property='payload'] - Property to send the payload in.
     * @returns {undefined}
     */
    send(command, payload, property = 'payload') {
        if(this.port) {
            super.send(command, payload, property);
        }
    }

    /**
     * Requests a response to a command.
     *
     * @async
     * @param {string} command - Command to send.
     * @param {?} [payload] - Payload to send along with the request.
     * @throws {NoPortError} If no port is connected.
     * @throws {PortGoneError} If the port disconnects while waiting for a reply.
     * @throws {?} With the other side's error.
     * @returns {?} Response from the other side.
     */
    request(command, payload) {
        if(!this.port) {
            return Promise.reject(new NoPortError());
        }
        else {
            return super.request(command, payload);
        }
    }
}
