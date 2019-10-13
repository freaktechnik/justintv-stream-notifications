/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import DatabaseManager, {
    FixListError, CantOpenListError, ListClosedError
} from '../src/database-manager';
import sinon from 'sinon';

test.afterEach.always(async () => {
    await DatabaseManager.close();
    DatabaseManager.loading = null; // eslint-disable-line require-atomic-updates
    DatabaseManager.error = null; // eslint-disable-line require-atomic-updates
});

test.serial('opening open list', async (t) => {
    await DatabaseManager.open();

    t.not(DatabaseManager.db, null);

    await DatabaseManager.open();

    t.not(DatabaseManager.db, null);
});

test.serial("Close closed db", async (t) => {
    await t.notThrowsAsync(DatabaseManager.close());

    await DatabaseManager.open();
});

test("FixListError", (t) => {
    const fle = new FixListError();
    t.true(fle instanceof Error);
});

test("CantOpenListError", (t) => {
    const fle = new CantOpenListError();
    t.true(fle instanceof Error);
});

test("ListClosedError", (t) => {
    const fle = new ListClosedError();
    t.true(fle instanceof Error);
});

test.serial('Cant open list', async (t) => {
    const { open } = window.indexedDB;
    window.indexedDB.open = () => {
        throw new Error();
    };

    const error = await t.throwsAsync(DatabaseManager.open());
    t.is(DatabaseManager.error, error);

    window.indexedDB.open = open; // eslint-disable-line require-atomic-updates
});

test.serial('registration list', (t) => {
    const list = 'foo';
    const list2 = 'bar';
    const db = {
        close: sinon.spy()
    };
    DatabaseManager.db = db;

    DatabaseManager.registerList(list);
    DatabaseManager.registerList(list2);

    t.is(DatabaseManager.lists.size, 2);

    DatabaseManager.unregisterList(list2);

    t.is(DatabaseManager.lists.size, 1);
    t.true(db.close.notCalled);

    DatabaseManager.unregisterList(list);

    t.is(DatabaseManager.lists.size, 0);
    t.true(db.close.calledOnce);
    t.is(DatabaseManager.db, null);
    t.is(DatabaseManager.loading, null);
});

test.serial('close list', async (t) => {
    const db = {
        close: sinon.spy()
    };
    DatabaseManager.db = db;
    const oldEmit = DatabaseManager.emit;
    DatabaseManager.emit = sinon.spy();

    await DatabaseManager.close();

    t.true(db.close.calledOnce);
    t.is(DatabaseManager.db, null);
    t.is(DatabaseManager.loading, null);
    t.true(DatabaseManager.emit.calledOnce);
    t.is(DatabaseManager.emit.lastCall.args[0], 'close');

    await DatabaseManager.close();

    t.true(DatabaseManager.emit.calledOnce);

    DatabaseManager.emit = oldEmit; // eslint-disable-line require-atomic-updates
});

test.serial('open list error', async (t) => {
    let onerror;
    const { open } = window.indexedDB;
    window.indexedDB.open = () => ({
        addEventListener(event, val) {
            if(event === "error") {
                onerror = val;
            }
        }
    });

    const p = DatabaseManager.open();

    onerror(new Error());

    const error = await t.throwsAsync(p, FixListError);

    t.is(DatabaseManager.db, null);
    t.is(DatabaseManager.error, error);

    window.indexedDB.open = open; // eslint-disable-line require-atomic-updates
});

test.serial('open list error without trying', async (t) => {
    let onerror;
    const { open } = window.indexedDB;
    window.indexedDB.open = () => ({
        addEventListener(event, val) {
            if(event === 'error') {
                onerror = val;
            }
        },
        error: new Error()
    });

    const p = DatabaseManager.open(DatabaseManager.name, true);

    onerror(new Error());

    const error = await t.throwsAsync(p, Error);

    t.is(DatabaseManager.db, null);
    t.is(DatabaseManager.error, error);

    window.indexedDB.open = open; // eslint-disable-line require-atomic-updates
});

test.todo('close event - fake idb doesnt allow close events');
test.todo('normal open');
test.todo('register open handler');
test.todo('register error handler');
test.todo('database upgrade fails');
test.todo('emit');
test.todo('database upgrade');
test.todo('idCache');
