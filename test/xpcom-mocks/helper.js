/**
 * Helpers for creating XPCOM component replacements for unit tests
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const xpcom = require("sdk/platform/xpcom");
const { Class: newClass } = require("sdk/core/heritage");
const { Ci, Cm } = require("chrome");

const registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);

/**
 * @typedef {string} ComponentType
 * @see {@link TYPE_SERVICE}, {@link TYPE_FACTORY}
 */

/**
 * The component is a service.
 * @type {ComponentType}
 * @default "service"
 * @const
 * @exported
 */
const TYPE_SERVICE = "service";
/**
 * The component is a normal factory.
 * @type {ComponentType
 * @default "factory"
 * @const
 * @exported
 */
const TYPE_FACTORY = "factory";

/**
 * Register the replacement component.
 * @callback registerFactory
 */
/**
 * Unregister the replacement component and restore the original.
 * @callback unregisterFactory
 * @param {boolean} [dontReregister=false] - Doesn't reregister the origianl
 *                                           factory. Make sure to call this
 *                                           function again without this
 *                                           parameter before registering the
 *                                           mock again.
 */

/**
 * Generates an XPCOM component that replaces an existing one.
 * @param {string} contractID - ContractID of the component to replace
 * @param {Array.<string>} IIDs - Interface names the component should
 *                                implement. The first item is assumed to be the
 *                                base interface. nsISupports can be omitted.
 * @param {Object} implementation - Holds the actual implementation of the
 *                                  component.
 * @param {ComponentType} [type = TYPE_FACTORY] - Type of the component that
 *                                                should be replaced. Defaults
 *                                                to a regular XPCOM component.
 * @return {Array.<registerFactory, unregisterFactory>} Methods to register and
 *                                                      unregister the
 *                                                      replacement component.
 */
exports.createMock = (contractID, IIDs, implementation, type = TYPE_FACTORY) => {
    if(!IIDs.length)
        throw "Must pass at least one interface ID";

    const originalFactory = Cm.getClassObject(xpcom.factoryByContract(contractID), Ci.nsIFactory);
    const factoryCID = registrar.contractIDToCID(contractID);

    var oldFactory;
    if(type === TYPE_SERVICE)
        oldFactory = xpcom.factoryByContract(contractID).getService(Ci[IIDs[0]]);
    else
        oldFactory = xpcom.factoryByContract(contractID).createInstance(Ci[IIDs[0]]);

    const ReplacementComponent = newClass(Object.assign(implementation(oldFactory), {
        extends: xpcom.Unknown,
        interfaces: IIDs
    }));

    let wrapperFactory = null;

    return [
        () => {
            if(wrapperFactory === null) {
                console.log("Replacing original factory of ", contractID);
                // Unregister the current alert service and replace it with our wrapper.
                registrar.unregisterFactory(factoryCID, originalFactory);
                const factorySpec = {
                    contract: contractID,
                    Component: ReplacementComponent,
                    unregister: false
                };
                if(type === "service") {
                    factorySpec.id = factoryCID;
                    wrapperFactory = new xpcom.Service(factorySpec);
                }
                else {
                    wrapperFactory = new xpcom.Factory(factorySpec);
                }
            }
        },
        (dontReregister = false) => {
            console.log("Restoring original factory of ", contractID);
            if(wrapperFactory !== null) {
                xpcom.unregister(wrapperFactory);
            }
            if(!dontReregister) {
                registrar.registerFactory(
                    factoryCID,
                    "Parental Controls Service",
                    contractID,
                    originalFactory
                );
            }
            wrapperFactory = null;
        }
    ];
};

exports.TYPE_FACTORY = TYPE_FACTORY;
exports.TYPE_SERVICE = TYPE_SERVICE;
