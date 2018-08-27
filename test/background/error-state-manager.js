import test from 'ava';
import { when } from '../../src/utils';
import { errorStateManager } from '../../src/background/error-state';

test.before(() => {
    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: []
    });
});

test.serial('unregister', async (t) => {
    browser.storage.local.set.resetHistory();

    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: [ {
            id: 'foo',
            gravity: 0,
            message: 'bar',
            actions: []
        } ]
    });

    const rv = await errorStateManager.unregister('foo');

    t.true(browser.storage.local.set.calledOnce);
    t.is(browser.storage.local.set.lastCall.args[0].errorStates.length, 0);
    t.true(rv);

    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: []
    });
});

test.serial('register', async (t) => {
    browser.storage.local.set.resetHistory();

    const es = {
        id: 'bar',
        message: 'baz',
        gravity: 1,
        actions: []
    };

    await errorStateManager.register(es.message, es.gravity, es.actions, es.id);

    t.true(browser.storage.local.set.calledOnce);
    t.deepEqual(browser.storage.local.set.lastCall.args[0].errorStates[0], es);
});

test.serial('in error state property', async (t) => {
    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: [ {
            id: 'foo',
            gravity: 0,
            message: 'bar',
            actions: []
        } ]
    });

    t.true(await errorStateManager.IN_ERROR_STATE);

    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: []
    });

    t.false(await errorStateManager.IN_ERROR_STATE);
});

test('register event', async (t) => {
    const p = when(errorStateManager, 'register');

    await errorStateManager.register('bar', 0, [], 'foo');

    await t.notThrowsAsync(p);
});

test.serial('empty event', async (t) => {
    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: [
            {
                id: 'foo'
            },
            {
                id: 'bar'
            }
        ]
    });

    const p = when(errorStateManager, 'empty');

    t.false(await errorStateManager.unregister('foo'));

    //TODO ensure promise is not resolved

    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: [ {
            id: 'bar'
        } ]
    });

    t.true(await errorStateManager.unregister('bar'));
    await p;

    browser.storage.local.get.withArgs("errorStates").resolves({
        errorStates: []
    });
});
