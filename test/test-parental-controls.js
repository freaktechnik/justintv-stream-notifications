/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const ParentalControls = requireHelper("../lib/parental-controls");
const { CC } = require("chrome");
const NativeParentalControls = CC("@mozilla.org/parental-controls-service;1", "nsIParentalControlsService");

//TODO use wrapper to do fun things

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
