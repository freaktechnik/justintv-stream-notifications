/**
 * Test utils.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import sinon from "sinon";
import { invokeOnce, when, emit, pipe } from "../src/utils";

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

test('when addEventListener', async (t) => {
    const mockEmitter = new EventTarget();
    mockEmitter.addEventListener = sinon.spy();
    const p = when(mockEmitter, 'event');

    t.true(mockEmitter.addEventListener.calledOnce);
    t.is(mockEmitter.addEventListener.lastCall.args[0], 'event');
    t.true(mockEmitter.addEventListener.lastCall.args[2].once);

    mockEmitter.addEventListener.lastCall.args[1]('foo bar');

    const result = await p;

    t.is(result, 'foo bar');
});

test('when onproperty', async (t) => {
    const mockEmitter = {
        onEvent: {
            addListener: sinon.spy(),
            removeListener: sinon.spy()
        }
    };
    const p = when(mockEmitter, 'event');

    t.true(mockEmitter.onEvent.addListener.calledOnce);

    const listener = mockEmitter.onEvent.addListener.lastCall.args[0];
    listener('foo bar');

    t.true(mockEmitter.onEvent.removeListener.calledOnce);
    t.is(mockEmitter.onEvent.removeListener.lastCall.args[0], listener);

    const result = await p;

    t.is(result, 'foo bar');
});

test('when non-emitter', (t) => {
    return t.notThrows(when({}, 'event'));
});

test('emit', (t) => {
    const emitter = {
        dispatchEvent: sinon.spy()
    };

    emit(emitter, 'test');

    t.true(emitter.dispatchEvent.calledOnce);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.false(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);

    emit(emitter, 'test', 'a');

    t.true(emitter.dispatchEvent.calledTwice);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);
    t.is(emitter.dispatchEvent.lastCall.args[0].detail, 'a');

    emit(emitter, 'test', 'a', 'b');

    t.true(emitter.dispatchEvent.calledThrice);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);
    t.deepEqual(emitter.dispatchEvent.lastCall.args[0].detail, [ 'a', 'b' ]);
});

test.todo('filterAsync');

test('pipe', (t) => {
    const source = {
        addEventListener: sinon.spy()
    };
    const target = {
        dispatchEvent: sinon.spy()
    };

    pipe(source, 'event', target);

    t.true(source.addEventListener.calledOnce);
    t.is(source.addEventListener.lastCall.args[0], 'event');
    t.true(target.dispatchEvent.notCalled);

    source.addEventListener.lastCall.args[1]('foo bar');

    t.true(target.dispatchEvent.calledOnce);
    t.is(target.dispatchEvent.lastCall.args[0], 'foo bar');
});
