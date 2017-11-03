import React from 'react';
import PropTypes from 'prop-types';
import Avatar from './avatar.jsx';
import { SMALL_IMAGE } from '../../utils';

const CompactChannel = (props) => ( <li title={ props.uname } onClick={ props.onClick } tabIndex={ 0 } onKeyUp={ (e) => {
    if(e.key === ' ' || e.key === 'Enter') {
        props.onClick(e);
    }
} } role="link">
    <Avatar image={ props.image } size={ SMALL_IMAGE }/>
</li> );
CompactChannel.propTypes = {
    uname: PropTypes.string.isRequired,
    image: PropTypes.objectOf(PropTypes.string).isRequired,
    onClick: PropTypes.func.isRequired
};

export default CompactChannel;
