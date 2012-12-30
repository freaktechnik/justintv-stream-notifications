addon.port.on("add", function (channel) {
    var element = document.createElement('li');
    var link = document.createElement('a');
	var image = new Image();
	image.src = channel.image;
	var textNode = document.createTextNode (channel.names[0]);
    element.id = channel.names[0];
	link.appendChild(image);
	link.appendChild(textNode);
    link.href = 'javascript:openTab("http://'+channel.url[0]+'")';
	link.title = channel.title;
    element.appendChild(link);
    document.getElementById('channels').appendChild(element);
	updatePanel();
});

addon.port.on("remove", function(channel) {
    document.getElementById('channels').removeChild(document.getElementById(channel)); 
	updatePanel();
});

function openTab(url) {
    addon.port.emit("openTab",url);
}

function resizePanel() {
	addon.port.emit("resizePanel",[212,document.body.scrollHeight]);
}

function showMessage() {
	if(document.getElementById('channels').getElementsByTagName("LI").length>0&&document.getElementById("channelslive").style.display=='none') {
		document.getElementById("channelslive").style.display = 'block';
		document.getElementById("channels").style.display = 'block';
        document.getElementById("refresh").style.display = 'block';
		document.getElementById("channelsoffline").style.display = 'none';
	}
	else if(document.getElementById('channels').getElementsByTagName("LI").length==0&&document.getElementById("channelsoffline").style.display=='none') {
		document.getElementById("channelslive").style.display = 'none';
		document.getElementById("channels").style.display = 'none';
        document.getElementById("refresh").style.display = 'none';
		document.getElementById("channelsoffline").style.display = 'block';
	}
}

function updatePanel() {
	showMessage();
	resizePanel();
}

function forceRefresh() {
    addon.port.emit("refresh");
}

window.onload = resizePanel;