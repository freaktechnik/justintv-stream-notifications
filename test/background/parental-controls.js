/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import ParentalControls from "../../src/background/parental-controls";

test.failing("Enabled", async (t) => {
    await ParentalControls.p;

    t.false(ParentalControls.enabled, "Parental controls state is correct");

    // Clean up async promise queue
    await ParentalControls.p;

    t.true(ParentalControls.enabled, "PC is enabled");
});
