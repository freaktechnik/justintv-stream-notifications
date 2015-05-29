/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Helper function script
 */

function hide(el) {
    el.setAttribute("hidden", true);
    if(el.selected)
        el.selected = false;
}

function show(el) {
    el.removeAttribute("hidden");
}

// Make sure they go into the global scope
window.hide = hide;
window.show = show;
