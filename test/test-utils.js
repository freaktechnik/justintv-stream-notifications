/**
 * Test utils.
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper"),
    { invokeOnce } = requireHelper("../lib/utils");

exports.testInvokeOnce = function(assert, done) {
    let counter = 0,
        id = 0;
    const cbk = () => {
            assert.equal(++counter, 1);
            assert.equal(id, 2);
            done();
        },
        firstCbk = invokeOnce(id++, cbk),
        secondCbk = invokeOnce(id++, cbk),
        thirdCbk = invokeOnce(id, cbk);

    assert.equal(typeof firstCbk, "function");
    assert.equal(typeof secondCbk, "function");
    assert.equal(typeof thirdCbk, "function");

    firstCbk();
    secondCbk();
    thirdCbk();
};

require("sdk/test").run(exports);
