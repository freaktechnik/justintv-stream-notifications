/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import ParentalControls from "../../src/background/parental-controls";

test("Enabled", async (t) => {
    SDKStubs.onMessage.dispatch({
        command: "pc-enabled-reply",
        payload: false
    });
    await ParentalControls.p;

    t.false(ParentalControls.enabled, "Parental controls state is correct");

    SDKStubs.onMessage.dispatch({
        command: "pc-enabled-reply",
        payload: true
    });
    // Clean up async promise queue
    await ParentalControls.p;

    t.true(ParentalControls.enabled, "PC is enabled");
});
