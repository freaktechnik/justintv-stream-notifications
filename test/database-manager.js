/**
 * @author Martin Giger
 * @license MPL-2.0
 */
import test from 'ava';
import DatabaseManager, { FixListError, CantOpenListError, ListClosedError } from '../src/database-manager';

test.serial('opening open list', async (t) => {
    await DatabaseManager.open();

    t.not(DatabaseManager.db, null);

    await DatabaseManager.open();

    t.not(DatabaseManager.db, null);
});

test.serial("Close closed db", async (t) => {
    await DatabaseManager.close();

    await t.notThrows(DatabaseManager.close());

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

test.todo("database manager");
