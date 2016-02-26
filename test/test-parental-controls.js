/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { Ci } = require("chrome");
const { factoryByContract } = require("sdk/platform/xpcom");
const NativeParentalControls = factoryByContract("@mozilla.org/parental-controls-service;1").createInstance(Ci.nsIParentalControlsService);

exports.testPCEnabled = function(assert) {
    const ParentalControls = requireHelper("../lib/parental-controls");
    assert.equal(ParentalControls.enabled, NativeParentalControls.parentalControlsEnabled, "Parental controls state is correct");
};

exports.testCanBrowseUrl = function(assert) {
    const ParentalControls = requireHelper("../lib/parental-controls");
    assert.ok(ParentalControls.canBrowse("http://example.com"));
};

exports.testLogDoesntThrow = function(assert) {
    const ParentalControls = requireHelper("../lib/parental-controls");
    ParentalControls.log("https://localhost");
    assert.pass("Log didn't throw");
};

require("sdk/test").run(exports);
