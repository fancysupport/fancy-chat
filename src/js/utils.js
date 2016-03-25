function dom_id(id) {
	return document.getElementById(id);
}

function dom_select(s) {
	return document.querySelector(s);
}

function dom_elem(s, id) {
	var d = document.createElement(s);
	if (id) d.id = id;
	return d;
}

function index_of(arr, e) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] === e) return i;
	}

	return -1;
}

function has_class(node, c) {
	var classes = node.className.split(' ');
	return -1 < index_of(classes, c);
}

function add_class(node, c) {
	if (node && ! has_class(node, c)) {
		if (node.className === '') {
			node.className = c;
		}
		else {
			var classes = node.className.split(' ');
			classes.push(c);
			node.className = classes.join(' ');
		}
	}
}

function remove_class(node, c) {
	if (node && has_class(node, c)) {
		var classes = node.className.split(' ');
		classes.splice(index_of(classes, c), 1);
		node.className = classes.join(' ');
	}
}

function add_event(event, node, fn) {
	if (!node || !node.addEventListener) return;
	node.addEventListener(event, fn);
}

function remove_event(event, node, fn) {
	if (!node || !node.removeEventListener) return;
	node.removeEventListener(event, fn);
}

function msg_content(content) {
	return content.replace(/\n+$/,'');
}

function random_id(len) {
	var chars = 'abcdefghijklnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	var id = '';
	for (var i = 0, n = chars.length; i < len; ++i) {
		id += chars.charAt(Math.floor(Math.random() * n));
	}
	return id;
}

