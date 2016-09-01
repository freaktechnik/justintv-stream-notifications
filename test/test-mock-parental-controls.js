/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper"),
    { registerService, unregisterService, getLogs, setEnabled } = require("./xpcom-mocks/parental-controls"),
    { before, after } = require("sdk/test/utils"),
    ParentalControls = requireHelper('../lib/parental-controls').default;

exports.testPCEnabled = (assert) => {
    setEnabled(true);
    assert.ok(ParentalControls.enabled, "Parental controls state is correct");

    setEnabled(false);
    assert.ok(!ParentalControls.enabled, "Parental controls say they're disabled when the component says tehy are");
};

exports.testCanBrowseUrl = (assert) => {
    setEnabled(false);
    assert.ok(ParentalControls.canBrowse("http://example.com"), "If service is disabled all pages can be browsed");

    setEnabled(true);
    assert.ok(!ParentalControls.canBrowse("http://example.com"), "If service is enabled pages are denied");

    assert.ok(ParentalControls.canBrowse("http://humanoids.be"), "Humanoids.be throws in the mock, but we only get a true, like the service was disabled");
};

exports.testLog = (assert) => {
    setEnabled(false);
    getLogs().length = 0;

    ParentalControls.log("https://localhost");
    assert.equal(getLogs().length, 0, "Isn't logged when the service is disabled");

    setEnabled(true);

    ParentalControls.log("https://localhost");
    assert.equal(getLogs().length, 1, "Logged url");
};

exports.testGracefulFailureWithoutComponent = (assert) => {
    unregisterService(true);

    assert.ok(!ParentalControls.enabled, "Even without registered component it returns false");
};

before(exports, () => {
    registerService();
});

after(exports, () => {
    unregisterService();
});

require("sdk/test").run(exports);
