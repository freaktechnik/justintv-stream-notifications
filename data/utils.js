/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Helper function script
 */
 
function hide(el) {
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
    if(el.selected)
        el.selected = false;
}

function show(el) {
    el.classList.remove("hidden");
    el.removeAttribute("aria-hidden");
}
