/* 
 *  Created by Martin Giger
 *  Licensed under MPL 2.0
 */
const LIST_SELECTED_CLASS = "selected";

window.addEventListener("load", function() {
    var targets = document.querySelectorAll(".selectableItemsList");
    for(var i = 0; i < targets.length; ++i) {
        new SelectableList(targets[i]);
    }
});

SelectableList.prototype.root = null;
function SelectableList(root) {
    this.root = root;
    var listItems = this.root.childNodes;
    for(var i = 0; i < listItems.length; ++i) {
        if(listItems[i].nodeName == "LI") {
            listItems[i].addEventListener("click", (function(evt) {
                this.select(evt.currentTarget);
            }).bind(this));
        }
    }
    this.root.addEventListener("keypress", (function(evt) {
        if(evt.keyCode == 38) {
            var cur = this.getSelectedItem();
            if(cur.previousSibling)
                this.select(cur.previousSibling);
        }
        else if(evt.keyCode == 40) {
            var cur = this.getSelectedItem();
            if(cur.nextSibling)
                this.select(cur.nextSibling);
        }
    }).bind(this));
    this.root.addEventListener("nodeadded", (function(evt) {
        evt.detail.addEventListener("click", (function(evt) {
            this.select(evt.currentTarget);
        }).bind(this));
    }).bind(this));
}

SelectableList.prototype.select = function(item) {
    if(this.getSelectedItem())
        this.getSelectedItem().classList.remove(LIST_SELECTED_CLASS);
    item.classList.add(LIST_SELECTED_CLASS);
    item.focus();
    var evObj = new CustomEvent("itemselected", { detail: item.id });
    this.root.dispatchEvent(evObj); 
};

SelectableList.prototype.getSelectedItem = function() {
    return this.root.querySelector("."+LIST_SELECTED_CLASS);
};

