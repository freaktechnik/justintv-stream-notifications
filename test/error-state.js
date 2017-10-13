import test from 'ava';
import ErrorStateConsts from '../src/error-state.json';

test('gravity constants exist', (t) => {
    t.true('RECOVERABLE' in ErrorStateConsts);
    t.true('UNRECOVERABLE' in ErrorStateConsts);
    t.true('NONE' in ErrorStateConsts);
});

test('gravity constants are unique', (t) => {
    t.not(ErrorStateConsts.RECOVERABLE, ErrorStateConsts.UNRECOVERABLE);
    t.not(ErrorStateConsts.UNRECOVERABLE, ErrorStateConsts.NONE);
});

test('store name in constants', (t) => {
    t.true('STORE' in ErrorStateConsts);
    t.is(typeof ErrorStateConsts.STORE, 'string');
});
