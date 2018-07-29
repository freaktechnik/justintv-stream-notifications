import React from 'react';
import PropTypes from 'prop-types';

const _ = browser.i18n.getMessage;

const SearchField = (props) => ( <div>
    <input className="searchField" type="search" value={ props.value } placeholder={ _('cm_filter_placeholder') } onChange={ props.onSearch }/>
</div> );
SearchField.defaultProps = {
    value: ""
};
SearchField.propTypes = {
    value: PropTypes.string,
    onSearch: PropTypes.func.isRequired
};

export default SearchField;
