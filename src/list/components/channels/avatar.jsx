import React from 'react';
import PropTypes from 'prop-types';

const Avatar = (props) => {
    const srcset = Object.keys(props.image).map((s) => `${props.image[s]} ${s}w`)
        .join(",");
    return ( <img srcSet={ srcset } sizes={ `${props.size}px` } alt="Avatar"/> );
};
Avatar.propTypes = {
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    size: PropTypes.number.isRequired
};

export default Avatar;
