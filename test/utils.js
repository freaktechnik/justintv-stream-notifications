/**
 * Test utils.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import sinon from "sinon";
import { invokeOnce } from "../src/utils";

test("invokeOnce", async (t) => {
    let id = 0;
    const cbk = sinon.spy(() => {
            t.is(id, 2);
            return Promise.resolve();
        }),
        firstCbk = invokeOnce(id++, cbk),
        secondCbk = invokeOnce(id++, cbk),
        thirdCbk = invokeOnce(id, cbk);

    t.is(typeof firstCbk, "function");
    t.is(typeof secondCbk, "function");
    t.is(typeof thirdCbk, "function");

    firstCbk();
    secondCbk();
    await thirdCbk();

    t.true(cbk.calledOnce);
});
