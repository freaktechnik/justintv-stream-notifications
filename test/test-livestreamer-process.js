/**
 * Test livestreamer/process
 * @author Martin Giger
 * @license MPL-2.0
 * @todo construct platform independent binary paths from PATH
 */
"use strict";

const requireHelper = require("./require_helper");
const process = requireHelper("../lib/livestreamer/process");

exports['test launching inexistant file'] = (assert) => {
    assert.throws(() => process.startProcess("/asdf"));
};

exports['test launching existing file'] = function*(assert) {
    yield process.startProcess("/usr/bin/git", ["--help"]);
};

require("sdk/test").run(exports);
