import test from 'ava';
import { and, or, not } from '../../src/background/logic';

const CASES = [
    [ true, true ],
    [ false, false ],
    [ true, false ],
    [ false, true ],
    [ true, true, true ],
    [ true, true, false ],
    [ false, false, false ]
];

const andTest = async (t, args) => {
    let expect = true;
    const p = [];
    for(const a of args) {
        expect = expect && a;
        p.push(Promise.resolve(a));
    }

    const result = await and(...p);

    t.is(result, expect);
};
const orTest = async (t, args) => {
    let expect = false;
    const p = [];
    for(const a of args) {
        expect = expect || a;
        p.push(Promise.resolve(a));
    }

    const result = await or(...p);

    t.is(result, expect);
};

for(const h of CASES) {
    test('and', andTest, h);
    test('or', orTest, h);
}

test('not', async (t) => {
    const tp = Promise.resolve(true);
    const fp = Promise.resolve(false);

    t.true(await not(fp));
    t.false(await not(tp));
});

test('and reject', (t) => {
    return t.throws(and(Promise.resolve(true), Promise.reject(new Error())), Error);
});

test('or reject', (t) => {
    return t.throws(or(Promise.resolve(false), Promise.reject(new Error())), Error);
});

test('not reject', (t) => {
    return t.throws(not(Promise.reject(new Error())), Error);
});
