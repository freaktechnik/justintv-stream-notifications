import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import SearchField from '../../../src/list/components/toolbar/search-field.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<SearchField onSearch={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with value', (t) => {
    const wrapper = shallow(<SearchField onSearch={ () => t.fail() } value="test"/>);
    t.snapshot(wrapper.html());
});
