import React from 'react';
import PropTypes from 'prop-types';

const ProviderSelector = (props) => {
    const options = [];
    for(const p in props.providers) {
        const provider = props.providers[p];
        if(provider.supports.featured) {
            options.push(<option value={ p } key={ p }>{ provider.name }</option>);
        }
    }
    return (
        <select className="exploreprovider browser-style" value={ props.currentProvider } onBlur={ props.onProvider }>
            { options }
        </select>
    );
};
ProviderSelector.defaultProps = {
    providers: {}
};
ProviderSelector.propTypes = {
    providers: PropTypes.objectOf(PropTypes.object),
    currentProvider: PropTypes.string,
    onProvider: PropTypes.func.isRequired
};

export default ProviderSelector;
