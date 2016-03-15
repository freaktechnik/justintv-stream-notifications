/**
 * @author Martin Giger
 * @license MPL-2.0
 */

/* global show */
/* global hide */

var SELECTED_CLASS = "current";

window.onload = function() {
    var roots = document.querySelectorAll(".tabbed");
    for(var i = 0; i < roots.length; ++i) {
        roots[i]._tabbed = new Tabbed(roots[i]);
    }
};

Tabbed.prototype.root = null;
Tabbed.prototype.length = 0;
Tabbed.prototype.current = 0;
function Tabbed(el) {
    this.root = el;
    this.length = this.root.querySelectorAll(".tabstrip a").length;

    var tabContents = this.root.querySelectorAll(".tabcontent");
    for(var i = 0; i < tabContents.length; ++i) {
        hide(tabContents[i]);
    }

    var tabs = this.root.querySelectorAll(".tabstrip a"), that = this;
    var clickListener = function(evt) {
        evt.preventDefault();
        that.select(parseInt(evt.currentTarget.dataset.tab, 10));
    };
    var keyListener = function(evt) {
        evt.preventDefault();
        if(evt.key == "ArrowLeft") {// left arrow key
            if(that.current != 1)
                that.select(that.current - 1);
        }
        else if(evt.key == "ArrowRight") { // right arrow key
            if(that.current < that.length)
                that.select(that.current + 1);
        }
    };

    for(var j = 0; j < tabs.length; ++j) {
        tabs[j].setAttribute("tabindex", -1);
        tabs[j].addEventListener("click", clickListener);
        tabs[j].addEventListener("keypress", keyListener);
    }

    if(this.root.querySelectorAll(".tabstrip a."+SELECTED_CLASS).length === 0 && this.length > 0) {
        this.select(1);
    }
    else {
        this.select(parseInt(this.root.querySelector(".tabstrip a."+SELECTED_CLASS).dataset.tab, 10));
    }
}

Tabbed.prototype.select = function(index) {
    if(index <= this.length && index > 0) {
        var prevTab = this.root.querySelector(".tabstrip a."+SELECTED_CLASS);
        if(prevTab) {
            prevTab.removeAttribute("aria-selected");
            prevTab.classList.remove(SELECTED_CLASS);
            prevTab.setAttribute("tabindex", -1);
            hide(this.getContentByIndex(parseInt(prevTab.dataset.tab, 10)));
        }

        this.current = index;
        var tab = this.getTabByIndex(index);
        tab.focus();
        tab.setAttribute("aria-selected", "true");
        tab.classList.add(SELECTED_CLASS);
        tab.setAttribute("tabindex", 0);
        show(this.getContentByIndex(index));
        var evObj = new CustomEvent("tabchanged", { detail: index });
        this.root.dispatchEvent(evObj);
    }
};

Tabbed.prototype.getTabByIndex = function(index) {
    var tabs = this.root.querySelectorAll(".tabstrip a");
    for(var i = 0; i < tabs.length; ++i) {
        if(parseInt(tabs[i].dataset.tab, 10) == index)
            return tabs[i];
    }
};

Tabbed.prototype.getContentByIndex = function(index) {
    var contents = this.root.querySelectorAll(".tabcontent");
    for(var i = 0; i < contents.length; ++i) {
        if(parseInt(contents[i].dataset.tab, 10) == index)
            return contents[i];
    }
};
