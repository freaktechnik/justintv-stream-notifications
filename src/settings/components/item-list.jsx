import React from 'react';
import PropTypes from 'prop-types';

const ItemList = (props) => {
    //TODO onSelect
    const items = props.items.map((item) => (<option key={ item.id } selected={ props.selected.includes(item.id) }>
        <img srcSet={ Object.entries(item.image)
            .map((size, url) => `${url} ${size}w`)
            .join(',')
        } sizes="50px" alt=""/>
        <span>{ item.uname }</span>
        <small>{ item.slug } | { item.type } | { item.id }</small>
    </option>));
    return (
        <select className="selectableItemsList" multiple>
            { items }
        </select>
    );
};

ItemList.defaultProps = {
    selected: []
};

ItemList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shapeOf({
        id: PropTypes.string.isRequired,
        slug: PropTypes.string.isRequired,
        uname: PropTypes.string.isRequired,
        image: PropTypes.objectOf(PropTypes.string).isRequired,
        type: PropTypes.string.isRequired
    })).isRequired,
    selected: PropTypes.arrayOf(PropTypes.string)
};

export default ItemList;
