function has_class(node, c) {
	var classes = node.className.split(' ');
	return -1 < _index_of(classes, c);
}

function add_class(node, c) {
	if (node && ! has_class(node, c))
		node.className += ' ' + c;
}

function remove_class(node, c) {
	if (node && has_class(node, c)) {
		var classes = node.className.split(' ');
		classes.splice(_index_of(classes, c), 1);
		node.className = classes.join(' ');
	}
}

function index_of(arr, e) {
	for (var i=0; i<arr.length; i++) {
		if (arr[i] === e) return i;
	}

	return -1;
}

function dom_id(id) {
	return document.getElementById(id);
}

function add_event(event, node, fn) {
	if ( ! node) return;
	if (node.addEventListener)
		node.addEventListener(event, fn);
	else if (node.attachEvent)
		node.attachEvent('on'+event, fn);
}

function remove_event(event, node, fn) {
	if ( ! node) return;
	if (node.removeEventListener)
		node.removeEventListener(event, fn);
	else if (node.detachEvent)
		node.detachEvent('on'+event, fn);
}

