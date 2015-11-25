/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Node filtering script
 */

/* global show */
/* global hide */

function filter(query, root, rules) {
    var nodes = root.children;

    for(var i = 0; i < nodes.length; ++i) {
        if(query) {
            if(matches(nodes[i], query.toLowerCase(), rules))
                show(nodes[i]);
            else
                hide(nodes[i]);
        }
        else {
            show(nodes[i]);
        }
    }
}

function matches(node, query, rules) {
    var target = node,
        queries = query.split(" ");
    return queries.every(function(q) {
        return rules.some(function(rule) {
            rule.attribute = rule.attribute || "textContent";
            if(rule.subtarget)
                target = node.querySelector(rule.subtarget);
            else
                target = node;

            if(rule.attribute == "class") {
                return checkClasses(target, q);
            }
            else {
                return target[rule.attribute].toLowerCase().indexOf(q) != -1;
            }
        });
    });
}

function checkClasses(node, query) {
    var classes = node.className.toLowerCase();
    // remove hidden from the list of classes
    if(node.classList.contains("hidden"))
        classes = classes.replace("hidden", "").trim();

    return classes.indexOf(query) != -1;
}

