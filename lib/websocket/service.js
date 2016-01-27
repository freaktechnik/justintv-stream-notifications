/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module websocket/service
 */
"use strict";

const { WebSocketHelper } = require("./helper");

const helpers = [];

/**
 * @argument {module:websocket/helper~WebSocketHelperOptions} options
 * @return {module:websocket/helper.WebSocketHelper}
 */
exports.getHelper = function(options) {
    return new WebSocketHelper(options);
};

/**
 * Pause all {@link module:websocket/helper.WebSocketHelper}s
 */
exports.pause = function() {
    helpers.forEach((h) => h.close());
};

/**
 * Resume all {@link module:websocket/helper.WebSocketHelper}s
 */
exports.resume = function() {
    helpers.forEach((h) => h.start());
};
