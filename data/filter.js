/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Node filtering script
 */
 
function filter(query, root, rules) {
    var node;

    rules.forEach(function(rule) {
        rule.attribute = rule.attribute || "textContent";
        node = root.querySelectorAll(rule.target);
        for(var i = 0; i < node.length; ++i) {
            if(query) {
                if(node.querySelector(rule.subtarget)[rule.attribute].includes(query))
                    show(node[i]);
                else
                    hide(node[i]);
            }
            else {
                show(node[i]);
            }
        }
    });
}
 