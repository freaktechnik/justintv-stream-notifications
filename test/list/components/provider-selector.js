import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import ProviderSelector from '../../../src/list/components/channels/provider-selector.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<ProviderSelector onProvider={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with providers', (t) => {
    const providers = {
        "test": {
            name: "Test",
            supports: {
                featured: true
            }
        }
    };
    const wrapper = shallow(<ProviderSelector providers={ providers } onProvider={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});
