/**
 * Helper function script.
 * @author Martin Giger
 * @license MPL-2.0
 */

/**
 * Hide an element. Unselects the element if it was previously selected.
 * @argument {DOMNode} el
 */
function hide(el) {
    el.setAttribute("hidden", true);
    if(el.selected)
        el.selected = false;
}

/**
 * Shows an element.
 * @argument {DOMNode} el
 */
function show(el) {
    el.removeAttribute("hidden");
}

// Make sure they go into the global scope
window.hide = hide;
window.show = show;
