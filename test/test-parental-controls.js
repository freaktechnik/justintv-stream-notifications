/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper"),
    { Ci } = require("chrome"),
    { factoryByContract } = require("sdk/platform/xpcom"),
    NativeParentalControls = factoryByContract("@mozilla.org/parental-controls-service;1").createInstance(Ci.nsIParentalControlsService),
    ParentalControls = requireHelper("../lib/parental-controls").default;

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
