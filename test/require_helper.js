/**
 * Require helper for code coverage
 */
const system = require("sdk/system");

module.exports = function (path) {
    if(system.env.JPM_MEASURING_COVERAGE)
        return require('../coverage/instrument/test/' + path);
    else
        return require(path);
};
