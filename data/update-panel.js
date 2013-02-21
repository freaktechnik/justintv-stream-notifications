/*
 * Created by Martin Giger
 * Licensed under LGPLv3
 */

addon.port.on("add", function(channel) {
    var element = document.createElement('li');
    var link = document.createElement('a');
	var image = new Image();
	image.src = channel.image[0];
	var textNode = document.createTextNode(channel.name);
    element.id = channel.login;
	link.appendChild(image);
	link.appendChild(textNode);
    link.href = 'javascript:openTab("'+channel.login+'")';
	link.title = channel.title;
    element.appendChild(link);
    document.getElementById('offline-list').appendChild(element);
	updatePanel();
});

function openTab(channel) {
    addon.port.emit("openTab",channel);
}

function resizePanel() {
    var h,width,padding=parseInt(window.getComputedStyle(document.body,null).marginLeft);
    do {
        h = document.body.scrollHeight;
        width = document.body.scrollWidth>addon.options.minWidth ? document.body.scrollWidth : addon.options.minWidth;
        document.body.style.width = width+"px";
    }while(h!=document.body.scrollHeight);
	addon.port.emit("resizePanel",[width+2*padding,h+2*padding]);
}

function showMessage() {
    var l = document.getElementById('live').getElementsByTagName("LI").length;
    var channelslive = document.getElementById('channelslive');
	if(l>0&&channelslive.style.display=='none') {
		channelslive.style.display = 'block';
		document.getElementById("live").style.display = 'block';
		document.getElementById("channelsoffline").style.display = 'none';
	}
	else if(l==0&&channelslive.style.display=='block') {
		channelslive.style.display = 'none';
		document.getElementById("live").style.display = 'none';
		document.getElementById("channelsoffline").style.display = 'block';
	}
    
    var lo = document.getElementById('offline-list').getElementsByTagName("LI").length;
    var arrow = document.getElementById('arrow');
    if(lo>0&&arrow.style.display=='none')
        arrow.style.display='block';
    else if(lo==0&&arrow.style.display=='block')
        arrow.style.display='none';
}

function updatePanel() {
	showMessage();
	resizePanel();
}

function forceRefresh() {
    addon.port.emit("refresh");
}

function onLoad() {
    addon.port.emit("loaded");
    document.addEventListener("dragstart",function(e) {
        e.preventDefault();
    });
    resizePanel();
}

function toggleOffline() {
    document.getElementById('offline').classList.toggle('openlist');
    document.getElementById('arrow').classList.toggle('rotated');
    updatePanel();
}

addon.port.on("remove", function(channel) { 
    document.getElementById('offline-list').removeChild(document.getElementById(channel)); 
	updatePanel();
});

addon.port.on("move", function(channel) {
    var node = document.getElementById(channel.login).cloneNode(true);
    var origin = 'offline-list', destination = 'live';
    if(!channel.live) {
        origin = 'live';
        destination = 'offline-list';
    }
    document.getElementById(origin).removeChild(document.getElementById(channel.login));
    document.getElementById(destination).appendChild(node);
    updatePanel();
});

window.onload = onLoad;
