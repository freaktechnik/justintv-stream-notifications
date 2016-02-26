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

const TYPE_SERVICE = "service";
const TYPE_FACTORY = "factory";

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
        () => {
            if(wrapperFactory !== null) {
                console.log("Restoring original factory of ", contractID);
                xpcom.unregister(wrapperFactory);
                registrar.registerFactory(
                    factoryCID,
                    "Parental Controls Service",
                    contractID,
                    originalFactory
                );
                wrapperFactory = null;
            }
        }
    ];
};

exports.TYPE_FACTORY = TYPE_FACTORY;
exports.TYPE_SERVICE = TYPE_SERVICE;
