/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import LiveState from "../src/live-state.js";

test("Test exported constants", (t) => {
    t.is(typeof LiveState, "object");
    for(const i in LiveState) {
        t.is(typeof LiveState[i], "number");
        t.is(i, i.toUpperCase());
    }
});
