/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module websocket/helper
 */
"use strict";

const { Class: newClass } = require("sdk/core/heritage");
const { Disposable } = require("sdk/core/disposable");
const { EventTarget } = require("sdk/event/target");
const { emit, setListeners, when } = require("sdk/event/core");

const views = new WeakMap();
const viewFor = (helper) => sockets.get(helper);

const models = new WeakMap();
const modelFor = (helper) => models.get(helper);

/**
 * @callback CommandCallback
 * @argument {?} [itemSpec] - Item metadata for the current command
 * @return {string} Command to send over the socket.
 */
/**
 * @typedef {Object} WebSocketHelperOptions
 * @property {string} url
 * @property {string|Array.<string>} [protocols]
 * @property {module:websocket/helper~CommandCallback} addItemCommand
 * @property {module:websocket/helper~CommandCallback} removeItemCommand
 * @property {module:websocket/helper~CommandCallback} [clearItemsCommand] - A
 * command that unsubscribes the socket from all items it registered for.
 * @property {function} [onError]
 * @property {function} [onMessage]
 * @property {function} [onStart]
 * @property {function} [onClose]
 */
/**
 * @event message
 * @type {string}
 */
/**
 * @event error
 */
/**
 * @event start
 */
/**
 * @event stop
 */
/**
 * @event itemremoved
 */
/**
 * @event itemadded
 */

const WebSocketHelper = newClass(
/** @lends module:websocket/helper.WebSocketHelper.prototype */
{
    extends: EventTarget,
    implements: [ Disposable ],
    /**
     * @constructs
     * @argument {module:websocket/helper~WebSocketHelperOptions} options
     * @extends external:sdk/event/target.EventTarget
     * @implements external:sdk/core/disposable.Disposable
     * @fires module:websocket/helper#message
     * @fires module:websocket/helper#error
     */
    setup: function(options) {
        setListeners(options);
        models.set(this, {
            items: new Set(),
            addItemCommand: options.addItemCommand,
            removeItemCommand: options.removeItemCommand,
            cleanItemsCommand: options.cleanItemsCommand,
            url: options.url,
            protocols: options.protocols
        });

        this.start();

        let socket = viewFor(this);

    },
    /**
     * Starts the WebSocket and adds all items added previously.
     * @return {Promise}
     * @fires module:websocket/helper#start
     */
    start: function() {
        if(views.has(this)) {
            if(viewFor(this).readyState < 2)
                this.close();
            else
                views.delete(this);
        }

        let model = modelFor(this);
        let socket = new WebSocket(model.url, model.protocols);
        views.set(this, socket);
        socket.addEventListener("error", (e) => emit(this, "error", e));
        socket.addEventListener("open", (e) => {
            for(let item in model.items) {
                socket.send(model.addItemCommand(item));
            }
            emit(this, "start", e);
        });
        socket.addEventListener("close", (e) => emit(this, "close", e));
        socket.addEventListener("message", (e) => emit(this, "message", e));
        return when(this, "start");
    },
    /**
     * Close the current WebSocket
     * @return {Promise}
     * @fires module:websocket/helper#close
     */
    close: function() {
        let model = viewFor(this);
        if(!model.clearItemsCommand) {
            let socket = modelFor(this);
            for(let item in model.items) {
                socket.send(model.removeItemCommand(item));
            }
        }
        else {
            modelFor(this).send(model.cleanItemsCommand);
        }
        viewFor(this).close();
        views.delete(this);

        return when(this, "close");
    },
    dispose: function() {
        this.close();
        models.delete(this);
    },
    /**
     * Subscribe to an item.
     * @argument {?} itemSpec
     * @fires module:websocket/helper#itemadded
     */
    addItem: function(itemSpec) {
        modelFor(this).items.add(itemSpec);
        if(viewFor(this).readyState == 1)
            viewFor(this).send(modelFor(this).addItemCommand(itemSpec));
        emit(this, "itemadded", itemSpec);
    },
    /**
     * Unsubscribe from an item.
     * @argument {?} itemSpec
     * @fires module:websocket/helper#itemremoved
     */
    removeItem: function(itemSpec) {
        modelFor(this).items.delete(itemSpec);
        if(viewFor(this).readyState == 1)
            viewFor(this).send(modelFor(this).removeItemCommand(itemSpec));
        emit(this, "itemremoved", itemSpec);
    }
});
exports.WebSocketHelper = WebSocketHelper;

