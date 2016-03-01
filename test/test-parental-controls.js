/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { Ci } = require("chrome");
const { factoryByContract } = require("sdk/platform/xpcom");
const NativeParentalControls = factoryByContract("@mozilla.org/parental-controls-service;1").createInstance(Ci.nsIParentalControlsService);
const ParentalControls = requireHelper("../lib/parental-controls");

exports.testPCEnabled = function(assert) {
    assert.equal(ParentalControls.enabled, NativeParentalControls.parentalControlsEnabled, "Parental controls state is correct");
};

exports.testCanBrowseUrl = function(assert) {
    assert.ok(ParentalControls.canBrowse("http://example.com"));
};

exports.testLogDoesntThrow = function(assert) {
    ParentalControls.log("https://localhost");
    assert.pass("Log didn't throw");
};

require("sdk/test").run(exports);
