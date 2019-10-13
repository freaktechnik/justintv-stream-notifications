/**
 * Serializes the providers so they can be sent over a message port.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module providers/serialized
 * @see {@link module:providers}
 */
import allProviders from './index.js';

/**
 * Frozen.
 *
 * @typedef {object} SerializedProvider
 * @property {string} name
 * @property {module:providers/generic-provider~ProviderSupports} supports
 * @property {boolean} enabled
 * @property {string[]} optionalPermissions
 */

/**
 * Serializes the providers objects so they can get passed as a message.
 *
 * @param {object.<module:providers/generic-provider.GenericProvider>} providers
 *                                              - Providers object to serialize.
 * @returns {object<module:providers/serialized~SerializedProvider>}
 *         Frozen Object of serialized providers by id.
 */
const serializeProviders = (providers) => {
    const ret = {};
    for(const p in providers) {
        ret[p] = Object.freeze({
            name: providers[p].name,
            supports: providers[p].supports,
            enabled: providers[p].enabled,
            optionalPermissions: providers[p].optionalPermissions
        });
    }
    Object.freeze(ret);
    return ret;
};

/**
 * @see {@link module:providers/serialized~serializeProviders}
 * @type {object<string, module:providers/serialized~SerializedProvider>}
 */
export default serializeProviders(allProviders);
