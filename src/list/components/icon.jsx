import React from 'react';
import PropTypes from 'prop-types';
import openIconic from 'open-iconic/sprite/open-iconic.min.svg';

const Icon = (props) => {
    return ( <svg className="icon" viewBox="0 0 8 8">
        <use xlinkHref={ `${openIconic}#${props.type}` }></use>
    </svg> );
};
Icon.propTypes = {
    type: PropTypes.string.isRequired
};

export default Icon;
