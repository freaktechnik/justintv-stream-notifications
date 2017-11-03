import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../icon.jsx';

const Extra = (props) => ( <li className={ `${props.type}Wrapper hide-offline` }>
    <Icon type={ Extra.ICONS[props.type] }/>&nbsp;<span className={ props.type }>{ props.value }</span>
</li> );
Extra.ICONS = Object.freeze({
    "viewers": "eye",
    "category": "tag",
    "provider": "hard-drive"
});
Extra.propTypes = {
    type: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired
};

export default Extra;
