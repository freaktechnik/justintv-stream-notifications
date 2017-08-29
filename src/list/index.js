// Set up DOM listeners and all that.
document.addEventListener("DOMContentLoaded", () => {
    //TODO keyboard navigation of channel list
    document.addEventListener("keypress", (e) => {
        if(!e.altKey && !e.shiftKey && !e.metaKey) {
            if(e.ctrlKey) {
                switch(e.key) {
                case 'F':
                    e.preventDefault();
                    //toggleSearch();
                    break;
                case 'R':
                    //refresh(e);
                    break;
                case 'C':
                    //TODO get currently hovered channel and dispatch copy command for it.
                    break;
                default:
                }
            }
            else if(e.code == "F5") {
                //refresh(e);
            }
        }
    }, {
        capture: true,
        passive: false
    });
});
