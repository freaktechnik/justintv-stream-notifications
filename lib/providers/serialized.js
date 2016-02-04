/**
 * Serializes the providers so they can be sent over a message port.
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/serialized
 * @see {@link module:providers}
 */

const allProviders = require("./index");

/**
 * Frozen.
 * @typedef {Object} SerializedProvider
 * @property {string} name
 * @property {module:providers/generic-provider~ProviderSupports} supports
 * @property {boolean} enabled
 */

/**
 * Serializes the providers objects so they can get passed as a message.
 * @argument {Object.<string, module:providers/generic-provider.GenericProvider>} providers
 * @return {Object<string, module:providers/serialized~SerializedProvider>}
 *         Frozen Object of serialized providers by id.
 */
const serializeProviders = (providers) => {
    const ret = {};
    for(let p in providers) {
        ret[p] = Object.freeze({
            name: providers[p].name,
            supports: providers[p].supports,
            enabled: providers[p].enabled
        });
    }
    Object.freeze(ret);
    return ret;
};

/**
 * @see {@link module:providers/serialized~serializeProviders}
 * @type {Object<string, module:providers/serialized~SerializedProvider>}
 */
module.exports = serializeProviders(allProviders);
