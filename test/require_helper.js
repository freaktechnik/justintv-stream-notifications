/**
 * Require helper for code coverage.
 * @author Martin Giger
 * @license MPL-2.0
 */
const system = require("sdk/system");

/**
 * Exports a special version of the require function, that returns instrumented
 * versions of modules if the environment variable "JPM_MEASURING_COVERAGE" is
 * set.
 */
module.exports = function (path) {
    if(system.env.JPM_MEASURING_COVERAGE)
        return require('../instrument/build/test/' + path);
    else
        return require(path);
};
