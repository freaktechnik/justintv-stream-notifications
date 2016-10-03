/**
 * Helper function script.
 * @author Martin Giger
 * @license MPL-2.0
 */

/**
 * Hide an element. Unselects the element if it was previously selected.
 *
 * @param {DOMNode} el - Node to hide.
 */
export function hide(el) {
    el.setAttribute("hidden", true);
    if(el.selected) {
        el.selected = false;
    }
};

/**
 * Shows an element.
 *
 * @param {DOMNode} el - Node to show.
 */
export function show(el) {
    el.removeAttribute("hidden");
};

/**
 * Shows or hides an element, dependent on the condition. If the condition is
 * truthy the element will be shown.
 *
 * @param {DOMNode} node - Node to toggle.
 * @param {boolean} condition - Condition whether the node should be shown.
 */
export function toggle(node, condition) {
    if(condition) {
        show(node);
    }
    else {
        hide(node);
    }
}
