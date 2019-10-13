import React from 'react';
import PropTypes from 'prop-types';

const _ = browser.i18n.getMessage;

const Toolbar = (props) => (
    <ul role="toolbar" className="toolbar inline-list actionbar">{ /* aria-controls the select */ }
        <li><button id="showDialog" onClick={ props.onAdd }>{ /* aria-controls="popup" */ }{ _("cm_add") }</button></li>
        <li><button id="updateItem" title={ _("cm_update_title") } onClick={ props.onUpdate }>{ _("cm_update") }</button></li>
        <li><button id="removeItem" aria-keyshortcuts="Delete" title={ _("cm_remove_title") } onClick={ props.onRemove }>{ _("cm_remove") }</button></li>
        { /* <li hidden><button id="autoAdd" aria-controls="users" title={ _("cm_autoAdd_title") }>{ _("cm_autoAdd") }</button></li> */ }
        <li className="flex"><input type="search" id="searchField" aria-keyshortcuts="Ctrl+F5" placeholder={ _("cm_filter_placeholder") } value={ props.search } onInput={ props.onSearch }/></li>
    </ul>
);

Toolbar.defaultProps = {
    search: ''
};

Toolbar.propTypes = {
    search: PropTypes.string,
    onAdd: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onSearch: PropTypes.func.isRequired
};

export default Toolbar;
