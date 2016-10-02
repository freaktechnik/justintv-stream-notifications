/**
 * Credentials search wrapper.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */

import SDK from "./sdk";

export const search = ({ url }) => {
    return SDK.doAction({
        target: "passwords-search",
        url
    });
};
