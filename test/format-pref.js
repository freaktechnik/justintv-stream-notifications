import test from 'ava';
import { format } from '../src/format-pref';

const TEST_DATA = [
    {
        type: 'string',
        value: 2,
        returnVal: '2'
    },
    {
        type: 'radio',
        value: 2,
        returnVal: '2'
    },
    {
        type: 'bool',
        value: 1,
        returnVal: true
    },
    {
        type: 'integer',
        value: '10',
        returnVal: 10
    },
    {
        type: 'integer',
        value: 0.6,
        returnVal: 1
    },
    {
        type: 'integer',
        value: -1,
        returnVal: 0
    },
    {
        type: 'string',
        value: 'a',
        returnVal: 'a'
    },
    {
        type: 'bool',
        value: false,
        returnVal: false
    },
    {
        type: 'radio',
        value: 'a',
        returnVal: 'a'
    },
    {
        type: 'integer',
        value: 1,
        returnVal: 1
    }
];

const testFormat = (t, data) => {
    const result = format(data.value, data.type);
    t.true(result === data.returnVal);
};

for(const data of TEST_DATA) {
    test('test format', testFormat, data);
}
