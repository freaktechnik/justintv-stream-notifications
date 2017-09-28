import test from 'ava';
import ErrorState from '../../src/background/error-state';
import { when } from '../../src/utils';

test.beforeEach(() => {
    browser.storage.local.get.withArgs('errorStates').resolves({
        errorStates: []
    });
});

test('gravity constants', (t) => {
    t.true('RECOVERABLE' in ErrorState);
    t.true('UNRECOVERABLE' in ErrorState);
});

test.serial('constructor', async (t) => {
    browser.notifications.create.resetHistory();
    browser.storage.local.set.resetHistory();
    browser.browserAction.setIcon.resetHistory();
    browser.browserAction.setBadgeText.resetHistory();
    browser.browserAction.setTitle.resetHistory();
    browser.browserAction.setPopup.resetHistory();

    const es = new ErrorState('foo', ErrorState.RECOVERABLE);

    await es._ready;

    t.is(es.message, 'foo');
    t.is(es.gravity, ErrorState.RECOVERABLE);
    t.is(es.actions.length, 0);
    t.true('id' in es);
    t.true(browser.notifications.create.calledOnce);
    t.true(browser.storage.local.set.calledOnce);
    t.true(browser.browserAction.setIcon.calledOnce);
    t.true(browser.browserAction.setBadgeText.calledOnce);
    t.is(browser.browserAction.setBadgeText.lastCall.args[0].text, '!');
    t.true(browser.browserAction.setTitle.calledOnce);
    t.true(browser.browserAction.setPopup.calledOnce);
    t.is(ErrorState.currentGravity, ErrorState.RECOVERABLE);
    t.true("oldPopupURL" in ErrorState);

    // reset global error state stuff
    await es.resolve();
});

test.serial('resolve resolvable state', async (t) => {
    const es = new ErrorState('foo', ErrorState.RECOVERABLE);

    await es._ready;

    browser.notifications.clear.resetHistory();
    browser.storage.local.set.resetHistory();
    browser.browserAction.setBadgeText.resetHistory();
    browser.browserAction.setPopup.resetHistory();

    await es.resolve();

    t.true(browser.notifications.clear.calledOnce);
    t.true(browser.storage.local.set.calledOnce);
    t.true(browser.browserAction.setBadgeText.calledOnce);
    t.is(browser.browserAction.setBadgeText.lastCall.args[0].text, '');
    t.true(browser.browserAction.setPopup.calledOnce);
    t.is(browser.browserAction.setPopup.lastCall.args[0].popup, ErrorState.oldPopupURL);
    t.is(ErrorState.currentGravity, 0);
});

test('resolve unresolvable state', (t) => {
    const es = new ErrorState('foo', ErrorState.UNRECOVERABLE);

    return t.throws(es.resolve());
});

test('action events', async (t) => {
    const es = new ErrorState('foo', ErrorState.RECOVERABLE, [ 'test' ]);

    let p = when(es, 'action');

    browser.notifications.onClicked.dispatch('copy');
    browser.notifications.onClicked.dispatch(ErrorState.NOTIFICATION_ID + es.id);

    const { detail: id } = await p;
    t.is(id, 0);

    p = when(es, 'action');

    browser.runtime.onMessage.dispatch({
        command: 'errorState-action',
        id: es.id,
        action: 42
    });

    const { detail: id2 } = await p;
    t.is(id2, 42);

    await es.resolve();

    t.is(browser.runtime.onMessage._listeners.length, 0);
    t.is(browser.notifications.onClicked._listeners.length, 0);
});
