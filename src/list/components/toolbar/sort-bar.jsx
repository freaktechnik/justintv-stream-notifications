import React from 'react';
import PropTypes from 'prop-types';
import SORT_FIELDS from '../../constants/sort.json';
import Icon from '../icon.jsx';
import { DEFAULT_SORT } from '../../utils.js';

const _ = browser.i18n.getMessage;

const SortBar = (props) => {
    const options = [];
    for(const field in SORT_FIELDS) {
        if(SORT_FIELDS[field].tabs.includes(props.activeTab)) {
            options.push(<option value={ field } key={ field }>{ _(`panel_sort_field_options_${field}`) }</option>);
        }
    }
    return (
        <div className="flexSelect">
            <select onInput={ props.onSortChange } value={ props.sortField } className="browser-style">
                { options }
            </select>
            <button onClick={ props.onReverseOrder } className="browser-style"><Icon type={ props.sortDirection ? 'sort-descending' : 'sort-ascending' }/></button>
        </div>
    );
};
SortBar.defaultProps = {
    sortField: DEFAULT_SORT,
    sortDirection: false
};
SortBar.propTypes = {
    sortField: PropTypes.string,
    sortDirection: PropTypes.bool,
    onSortChange: PropTypes.func.isRequired,
    onReverseOrder: PropTypes.func.isRequired,
    activeTab: PropTypes.number.isRequired
};

export default SortBar;
