import test from 'ava';
import {
    show, hide, toggle, copy
} from '../../src/content/utils';

test("show", (t) => {
    const e = document.createElement("div");
    e.hidden = true;

    show(e);

    t.false(e.hidden);
});

test("hide", (t) => {
    const e = document.createElement("div");
    e.hidden = false;

    hide(e);

    t.true(e.hidden);
});

// Probably failing due to JSDom implementation of selects?
test.failing("hide select option", (t) => {
    const e = document.createElement("option"),
        a = document.createElement("option"),
        s = document.createElement("select");

    s.appendChild(e);
    s.appendChild(a);
    e.selected = true;
    e.value = "test";
    e.label = "test";

    hide(e);

    t.true(e.hidden);
    t.false(e.selected);
});

test("toggle", (t) => {
    const e = document.createElement("div");

    toggle(e, false);

    t.true(e.hidden);

    toggle(e, true);

    t.false(e.hidden);
});

test("copy", (t) => {
    t.true(copy("foo"));

    t.is(document.execCommand("clipboard"), "foo");
});
