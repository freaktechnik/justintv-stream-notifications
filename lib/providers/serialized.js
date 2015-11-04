/**
 * Serializes the providers so they can be sent over a message port.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/serialized
 * @see {@link module:providers}
 * @hastests
 */

const providers = require("../providers");

/**
 * Serializes the providers objects so they can get passed as a message.
 * @argument {Object.<string,module:providers/generic-provider.GenericProvider>} providers
 * @return {Object<string, Object>} Object of serialized providers.
 */
const serializeProviders = () => {
    let ret = {};
    for(let p in providers) {
        ret[p] = {
            name: providers[p].name,
            supports: providers[p].supports
        };
    }
    return ret;
};

module.exports = serializeProviders();
