import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Avatar from '../../../src/list/components/channels/avatar.jsx';

test('snapshot', (t) => {
    const image = {
        16: "https://example.com/foo",
        32: "https://example.com/bar"
    };
    const wrapper = shallow(<Avatar image={ image } size={ 24 }/>);
    t.snapshot(wrapper.html());
});
