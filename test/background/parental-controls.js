/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import ParentalControls from "../../src/background/parental-controls";

test("Enabled", async (t) => {
    SDKStubs.onMessage.dispatch({
        target: "pc-enabled-reply",
        payload: false
    });
    t.false(ParentalControls.enabled, "Parental controls state is correct");

    SDKStubs.onMessage.dispatch({
        target: "pc-enabled-reply",
        payload: true
    });
    // Clean up async promise queue
    await Promise.resolve();

    t.true(ParentalControls.enabled);
});
