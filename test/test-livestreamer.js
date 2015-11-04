/**
 * Livestreamer module tests
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const livestreamer = requireHelper("../lib/livestreamer");
const { prefs } = require("sdk/simple-prefs");
const { when } = require("sdk/event/utils");

exports["test existance event"] = function*(assert) {
    let p = when(livestreamer.events, "existance");
    prefs.livestreamer_enabled = true;
    yield p;
    p = when(livestreamer.events, "existance");
    prefs.livestreamer_enabled = false;
    yield p;
    p = when(livestreamer.events, "existance");
    prefs.livestreamer_path = "/does/not/exist";
    yield p;
    prefs.livestreamer_path = "";
};

exports["test show property"] = (assert) => {
    prefs.livestreamer_enabled = true;
    assert.ok(!livestreamer.show);
    prefs.livestreamer_enabled = false;
    // Can't test for this, since we don't require a livestreamer for unit tests.
};

exports["test default property"] = (assert) => {
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
    prefs.livestreamer_enabled = true;
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
    prefs.livestreamer_enabled = false;
    assert.equal(livestreamer.default, prefs.livestreamer_enabled);
};

exports["test event object interface"] = (assert) => {
    assert.equal(typeof livestreamer.events, "object");
    assert.equal(typeof livestreamer.events.on, "function");
};

require("sdk/test").run(exports);
