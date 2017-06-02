import test from 'ava';
import { copy } from '../../src/content/utils';

test.todo("show");
test.todo("hide");
test.todo("toggle");

test("copy", (t) => {
    t.true(copy("foo"));

    t.is(document.execCommand("clipboard"), "foo");
});
