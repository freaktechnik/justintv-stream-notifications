/**
 * Test utils.
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from "ava";
import sinon from "sinon";
import {
    when,
    emit,
    pipe
} from "../src/utils";

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

    const [ listener ] = mockEmitter.onEvent.addListener.lastCall.args;
    listener('foo bar');

    t.true(mockEmitter.onEvent.removeListener.calledOnce);
    t.true(mockEmitter.onEvent.removeListener.calledWith(listener));

    const result = await p;

    t.is(result, 'foo bar');
});

test('when non-emitter', (t) => t.notThrowsAsync(when({}, 'event')));

test('emit', (t) => {
    const emitter = {
        dispatchEvent: sinon.spy(() => true)
    };

    let e = emit(emitter, 'test');

    t.true(emitter.dispatchEvent.calledOnce);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.false(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);
    t.true(e);

    e = emit(emitter, 'test', 'a');

    t.true(emitter.dispatchEvent.calledTwice);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);
    t.is(emitter.dispatchEvent.lastCall.args[0].detail, 'a');
    t.true(e);

    e = emit(emitter, 'test', 'a', 'b');

    t.true(emitter.dispatchEvent.calledThrice);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof Event);
    t.true(emitter.dispatchEvent.lastCall.args[0] instanceof CustomEvent);
    t.deepEqual(emitter.dispatchEvent.lastCall.args[0].detail, [
        'a',
        'b'
    ]);
    t.true(e);
});

test('emit event instance', (t) => {
    const emitter = {
        dispatchEvent: (e) => {
            t.true(e.cancelable);
            e.preventDefault();
            t.true(e.defaultPrevented);
            return false;
        }
    };

    const e = emit(emitter, 'test');

    t.false(e);
});

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

    source.addEventListener.lastCall.args[1]({
        type: 'event',
        detail: 'foo bar'
    });

    t.true(target.dispatchEvent.calledOnce);
    t.is(target.dispatchEvent.lastCall.args[0].detail, 'foo bar');
});
