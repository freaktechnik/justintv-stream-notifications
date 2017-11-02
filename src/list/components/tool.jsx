import React from 'react';
import PropTypes from 'prop-types';
import Icon from './icon.jsx';

const _ = browser.i18n.getMessage;

const Tool = (props) => ( <li>
    <button title={ _(`${props.title}.title`) } onClick={ props.onClick } aria-pressed={ props.active ? "true" : "false" } className={ props.className } onContextMenu={ props.onContextMenu }>
        <Icon type={ props.icon }/>
    </button>
</li> );
Tool.defaultProps = {
    active: false
};
Tool.propTypes = {
    onClick: PropTypes.func,
    title: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    className: PropTypes.string,
    active: PropTypes.bool,
    onContextMenu: PropTypes.func
};

export default Tool;
