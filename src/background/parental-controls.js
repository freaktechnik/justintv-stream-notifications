/**
 * Parental controls wrapper.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import SDK from './sdk';

let enabled = false;

const getEnabled = () => SDK.doAction({ target: "pc-enabled" }).then((e) => {
    enabled = e;
});

export default {
    get enabled() {
        getEnabled();
        return enabled;
    }
};

getEnabled();
