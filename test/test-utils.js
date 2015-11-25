/**
 * Test utils.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const { invokeOnce } = requireHelper("../lib/utils");

exports.testInvokeOnce = function(assert, done) {
    let counter = 0;
    let id = 0;
    let cbk = () => {
        assert.equal(++counter, 1);
        assert.equal(id, 2);
        done();
    };

    let firstCbk = invokeOnce(id++, cbk);
    assert.equal(typeof firstCbk, "function");
    let secondCbk = invokeOnce(id++, cbk);
    assert.equal(typeof secondCbk, "function");
    let thirdCbk = invokeOnce(id, cbk);
    assert.equal(typeof thirdCbk, "function");

    firstCbk();
    secondCbk();
    thirdCbk();
};

require("sdk/test").run(exports);
