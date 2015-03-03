var _CLICK_HANDLER; // activator click function
var _OLD_ONERROR; // previous value of window.onerror
var _URL = 'http://api.fancysupport.com:4000/client';
var _APP_NAME;
var _APP_ICON;
var _EMAIL_MD5;
var _CURRENT_VIEW;
var _SETTINGS; // storing appkey etc
var _USER;
var _USERS;
var _ACTIVE_THREAD;
var _THREADS;

var _NODE_TEXTAREA;
var _NODE_CHAT;
var _NODE_LISTINGS;

var _INITTED;
var _FETCH_INTERVAL;

// set default empty values onload
_set_defaults();

function _has_class(node, c) {
	var classes = node.className.split(' ');
	return -1 < _index_of(classes, c);
}

function _add_class(node, c) {
	if (node && ! _has_class(node, c))
		node.className += ' ' + c;
}

function _remove_class(node, c) {
	if (node && _has_class(node, c)) {
		var classes = node.className.split(' ');
		classes.splice(_index_of(classes, c), 1);
		node.className = classes.join(' ');
	}
}

function _index_of(arr, e) {
	for (var i=0; i<arr.length; i++) {
		if (arr[i] === e) return i;
	}

	return -1;
}

function _id(id) {
	return document.getElementById(id);
}

function _add_event(event, node, fn) {
	if ( ! node) return;
	if (node.addEventListener)
		node.addEventListener(event, fn);
	else if (node.attachEvent)
		node.attachEvent('on'+event, fn);
}

function _remove_event(event, node, fn) {
	if ( ! node) return;
	if (node.removeEventListener)
		node.removeEventListener(event, fn);
	else if (node.detachEvent)
		node.detachEvent('on'+event, fn);
}

function _timeago(time) {
	var
			local  = Math.floor(new Date().getTime()/1000),
			offset = Math.abs((local - time)),
			span   = [],
			MINUTE = 60,
			HOUR   = 3600,
			DAY    = 86400,
			WEEK   = 604800,
			YEAR   = 31556926,
			DECADE = 315569260;

		if (offset <= MINUTE)              span = [ '', 'moments' ];
		else if (offset < (MINUTE * 60))   span = [ Math.round(Math.abs(offset / MINUTE)), 'min' ];
		else if (offset < (HOUR * 24))     span = [ Math.round(Math.abs(offset / HOUR)), 'hour' ];
		else if (offset < (DAY * 7))       span = [ Math.round(Math.abs(offset / DAY)), 'day' ];
		else if (offset < (WEEK * 52))     span = [ Math.round(Math.abs(offset / WEEK)), 'week' ];
		else if (offset < (YEAR * 10))     span = [ Math.round(Math.abs(offset / YEAR)), 'year' ];
		else if (offset < (DECADE * 100))  span = [ Math.round(Math.abs(offset / DECADE)), 'decade' ];
		else                               span = [ '', 'a long time' ];

		span[1] += (span[0] === 0 || span[0] > 1) ? 's' : '';
		span = span.join(' ');

		return span + ' ago';
}

function _ajax(opts, cb) {
	var parse = function (req) {
		var result;
		try {
			result = JSON.parse(req.responseText);
		} catch (e) {
			result = req.responseText;
		}
		return {code: req.status, data: result};
	};

	if (opts.method === 'GET') opts.url += '?bust=' + (new Date()).getTime();

	var XHR = XMLHttpRequest || ActiveXObject;
	var request = new XHR('MSXML2.XMLHTTP.3.0');
	request.open(opts.method, _URL+opts.url, true);

	if (opts.json) {
		request.setRequestHeader('Content-type', 'application/json');
		opts.data = JSON.stringify(opts.data);
	} else
		request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

	request.setRequestHeader('X-App-Key', _SETTINGS.app_key);
	request.setRequestHeader('X-Signature', _SETTINGS.signature);
	request.setRequestHeader('X-Customer-Id', _USER.customer_id);

	request.onreadystatechange = function () {
		if (request.readyState === 4 && cb) {
			var obj = parse(request);
			if (request.status >= 200 && request.status < 300) {
				cb(obj);
			} else {
				cb(null, obj.error || obj);
			}
		}
	};
	request.send(opts.data);
}


function _render_widget() {
	// append the widget to the end of the body, check to make sure
	// it hasn't already been created, if it has, recreate
	var div = _id('fancy-chat');
	if ( ! div) {
		div = document.createElement('div');
		div.id = 'fancy-chat';
		document.body.appendChild(div);
	}

	div.innerHTML = _TEMPLATES.widget();

	_NODE_CHAT = document.querySelector('#fancy-chat .fancy-chat');
	_NODE_LISTINGS = _id('fancy-listings');
}

function _render_header(data) {
	var div = _id('fancy-header');

	div.innerHTML = _TEMPLATES.header(data);

	var chatsFn = function() { _click_chats(); };
	var newFn = function() { _render_new_chat(); };

	_add_event('click', _id('fancy-newchats'), data.which == 'fancy-icon-pencil' ? newFn : chatsFn);

	_add_event('click', _id('fancy-close'), function() {
		_remove_widget();
	});
}

function _render_new_chat(reply) {
	_CURRENT_VIEW = 'new';

	// don't need to render this if we're just going to overwrite it
	if ( ! reply) _render_header({title: 'New Message', which: 'fancy-icon-list'});

	var phrase = reply ? 'Reply to ' : 'Send a message to ';
	_NODE_CHAT.innerHTML = _TEMPLATES.chat(phrase + _APP_NAME);
	_remove_class(_NODE_CHAT, 'fancy-hide');

	_NODE_LISTINGS.innerHTML = '';
	_add_class(_NODE_LISTINGS, 'fancy-hide');

	_NODE_TEXTAREA = _id('fancy-textarea');

	_add_event('click', _id('fancy-send'), function() {
		_click_send();
	});
}

function _render_existing_chat(partial) {
	if (_CURRENT_VIEW !== 'existing') return;

	// skip rendering parts of the ui if they aren't changing
	// stops textarea being cleared after a reply
	if ( ! partial) {
		_render_new_chat(true);
		_render_header({title: _APP_NAME, which: 'fancy-icon-list'});
	}

	// if this thread has unread messages, send a read call
	if (_ACTIVE_THREAD.unread) {
		_update_read(function() {
			_update_active(function() {
				_check_updates();
			});
		});
	}

	var div = _id('fancy-messages');

	div.innerHTML = _TEMPLATES.messages(_ACTIVE_THREAD);
	div.scrollTop = div.scrollHeight;
}

function _render_listings() {
	if (_CURRENT_VIEW !== 'listing') return;

	_render_header({title: _APP_NAME, which: 'fancy-icon-pencil'});

	_THREADS.sort(function(a, b) {
		return (! a.unread && b.unread) || a.updated < b.updated;
	});

	_NODE_LISTINGS.innerHTML = _TEMPLATES.listings(_THREADS);
	_remove_class(_NODE_LISTINGS, 'fancy-hide');

	_NODE_CHAT.innerHTML = '';
	_add_class(_NODE_CHAT, 'fancy-hide');
}

function _remove_widget() {
	_CURRENT_VIEW = null;
	_NODE_TEXTAREA = null;

	var chat = _id('fancy-chat');
	if (chat) document.body.removeChild(chat);
}


function _set_defaults() {
	_NODE_TEXTAREA = null;
	_NODE_CHAT = null;
	_NODE_LISTINGS = null;

	_EMAIL_MD5 = '';
	_CURRENT_VIEW = null;

	_SETTINGS = {};
	_USER = {};
	_USERS = {};

	_ACTIVE_THREAD = null;
	_THREADS = [];

	_APP_NAME = '';
	_APP_ICON = '';

	_INITTED = false;

	if (_FETCH_INTERVAL) clearInterval(_FETCH_INTERVAL);
	_FETCH_INTERVAL = null;
}

function _get_avatar(id) {
	var d = 'mm';

	// if there's a default image given, or one of gravatars, use that
	if (_SETTINGS.default_avatar) d = _SETTINGS.default_avatar;

	// if there's an id, it's a fancy dude
	if (id)
		return _APP_ICON ? 'http://cdn.fancy.support/' + _APP_ICON : 'https://secure.gravatar.com/avatar/?d=' + d;

	// use the avatar they gave us if available
	if (_USER.avatar) return _USER.avatar;

	return 'https://secure.gravatar.com/avatar/' + _EMAIL_MD5 + '?d=' + d;
}

function _get_settings() {
	_ajax({
		method: 'GET',
		url: '/settings'
	}, function(ok) {
		if (ok && ok.data) {
			for (var id in ok.data) {
				if (ok.data.hasOwnProperty(id) && ok.data[id] !== undefined) {
					var value = ok.data[id];

					switch(id) {
						case 'app_icon':
							_APP_ICON = value;
							var img = new Image();
							img.src = _get_avatar(true);
							break;

						case 'app_name':
							_APP_NAME = value; break;

						default:
							_USERS[id] = value;
					}
				}
			}
		}
	});
}

function _get_messages(cb) {
	_ajax({
		method: 'GET',
		url: '/messages'
	}, function(ok) {
		if (ok) {
			_THREADS = ok.data;
			_check_updates();
			if (cb) cb();
		}
	});
}

function _has_unreads() {
	for (var i=0; i<_THREADS.length; i++) {
		if (_THREADS[i].unread) return true;
	}
}

function _check_updates() {
	var updates = 0;

	for (var i=0; i<_THREADS.length; i++) {
		var thread = _THREADS[i];
		var last_read = thread.last_read;

		if (last_read < thread.created) {
			updates++;
			thread.unread = true;
		}

		for (var j=0; j<thread.replies.length; j++) {
			var reply = thread.replies[j];

			// check if it's after they've last seen, and not a message
			// that they have sent
			if (reply.created > last_read && ! reply.incoming) {
				updates++;
				thread.unread = true;
			}
		}
	}

	if (updates === 0) updates = '';

	if (_SETTINGS.unread_counter) {
		var node = document.querySelector(_SETTINGS.unread_counter);
		if (node) node.innerHTML = updates;
	}
}

function _update_active(cb) {
	_get_messages(function() {
		if ( ! _ACTIVE_THREAD) return;
		// reassign the active conversation
		for (var i=0; i<_THREADS.length; i++) {
			if (_ACTIVE_THREAD.id === _THREADS[i].id) {
				_ACTIVE_THREAD = _THREADS[i];
			}
		}

		if (cb) cb();
	});
}

function _update_read(cb) {
	if ( ! _ACTIVE_THREAD) return;

	_ajax({
		method: 'POST',
		url: '/messages/' + _ACTIVE_THREAD.id + '/read'
	}, function() {
		if (cb) cb();
	});
}

function _click_send() {
	var message = _NODE_TEXTAREA.value;
	_NODE_TEXTAREA.value = '';

	if (message === '') return;

	var data = {
		content: message
	};

	if (_ACTIVE_THREAD) { // replying to an existing conversation
		_ajax({
			method: 'POST',
			url: '/messages/' + _ACTIVE_THREAD.id + '/reply',
			data: data,
			json: true
		}, function(ok) {
			if (ok) {
				// set some things on the data object so ui updates right
				data.incoming = true;
				data.created = Math.floor(new Date().getTime()/1000);
				data.user_id = '';
				_ACTIVE_THREAD.replies.push(data);

				_CURRENT_VIEW = 'existing';
				_render_existing_chat(true);

				_update_active(function() {
					_render_existing_chat(true);
				});
			}
		});
	} else {  // creating a new conversation
		_ajax({
			method: 'POST',
			url: '/messages',
			data: data,
			json: true
		}, function(ok) {
			if (ok) {
				ok.data.replies = [];
				_ACTIVE_THREAD = ok.data;
				_THREADS.push(_ACTIVE_THREAD);
				_CURRENT_VIEW = 'existing';
				_render_existing_chat();
			}
		});
	}
}

function _click_chats_update() {
	if (_CURRENT_VIEW !== 'listing') return;

	_render_listings();
	_ACTIVE_THREAD = null;

	var fn = function() {
		var id = this.getAttribute("data-id");
		_ACTIVE_THREAD = _THREADS[id];

		_CURRENT_VIEW = 'existing';
		_render_existing_chat();
	};

	var convos = document.querySelectorAll('.fancy-listing');
	for (var i=0; i<convos.length; i++) {
		convos[i].onclick = fn;
	}
}

function _click_chats() {
	// show what we have so it's quick
	_CURRENT_VIEW = 'listing';
	_click_chats_update();

	// get new stuff too so it's right
	_get_messages(function() {
		_click_chats_update();
	});
}


function _init(options) {
	if (typeof options !== 'object') {
		console.error("FancySupport needs a config object to run.");
		return;
	}

	if ( ! options.signature) {
		console.error("FancySupport needs a customer signature field: signature");
		return;
	}

	if ( ! options.app_key) {
		console.error("FancySupport needs an application key field: app_key.");
		return;
	}

	if ( ! options.customer_id) {
		console.error("FancySupport needs a customer id field: customer_id.");
		return;
	}

	// if they're reinitting then clear the previous
	if (_INITTED) {
		_clear();
	}

	// setup initial settings
	_set_defaults();

	_SETTINGS = {
		app_key: options.app_key,
		signature: options.signature,
		default_avatar: options.default_avatar,
		activator: options.activator,
		unread_counter: options.unread_counter
	};

	_USER.customer_id = options.customer_id;

	if (options.name) _USER.name = options.name;
	if (options.email) _USER.email = options.email;
	if (options.phone) _USER.phone = options.phone;
	if (options.avatar) _USER.avatar = options.avatar;

	if (options.custom_data) {
		if (typeof options.custom_data === 'object')
			_USER.custom_data = options.custom_data;
		else
			console.error('FancySupport custom_data needs to be an object.');
	}

	_OLD_ONERROR = window.onerror;
	var new_onerror = function(error, file, line) {
		try {
			var e = {
				name: 'error'
			};

			if (error) e.desc = ''+error;

			if (file || line) {
				e.data = {};
				if (file) e.data.file = ''+file;
				if (line) e.data.line = ''+line;
			}

			_event(e);
		} catch(ex) {}

		if (_OLD_ONERROR) _OLD_ONERROR.apply(this, arguments);
	};

	if (options.log_errors) window.onerror = new_onerror;

	_impression();
	_get_settings();
	_get_messages();

	// perform this once
	_EMAIL_MD5 = _calc_md5(_USER.email);

	// preload avatar
	var img = new Image();
	img.src = _get_avatar();

	_USERS[''] = _USER.name;

	_FETCH_INTERVAL = setInterval(function() {
		_get_messages();
	}, 10*60*1000);

	// save a reference to this function because we need it for when we unlisten
	_CLICK_HANDLER = function() {
		_render_widget();

		if (_ACTIVE_THREAD) {
			// get something out quick
			_CURRENT_VIEW = 'existing';
			_render_existing_chat();

			// get the most recent version of active
			_update_active(function() {
				_render_existing_chat();
			});
		} else {
			if (_has_unreads()) {
				_click_chats();
			} else {
				// get new versions on open
				_render_new_chat();
				_get_messages();
			}
		}
	};

	_add_event('click', document.querySelector(_SETTINGS.activator), _CLICK_HANDLER);

	String.prototype.encodeHTML = function() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
		matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}();

	_INITTED = true;
}

function _impression() {
	var impression = {};

	if (_USER.name) impression.name = _USER.name;
	if (_USER.email) impression.email = _USER.email;
	if (_USER.phone) impression.phone = _USER.phone;
	if (_USER.custom_data) impression.custom_data = _USER.custom_data;
	impression.resolution = [window.innerWidth, window.innerHeight];

	_ajax({method: 'POST', url: '/impression', data: impression, json: true});
}

function _event(opts, cb) {
	// nothing or no name, so go home
	if ( ! opts || ! opts.name) return;

	// set them all to strings since numbers produce errors
	var event = {
		name: ''+opts.name
	};

	if (opts.desc) event.description = ''+opts.desc;
	if (opts.data) event.custom_data = opts.data;

	_ajax({
		method: 'POST',
		url: '/events',
		data: event,
		json: true
	}, cb);
}

function _clear() {
	if (_INITTED) {
		_remove_event('click', document.querySelector(_SETTINGS.activator), _CLICK_HANDLER);
		_set_defaults();
		_remove_widget();
		window.onerror = _OLD_ONERROR || function(){};

		_INITTED = false;
	}
}

var FancySupport = {
	init: _init,
	impression: _impression,
	event: _event,
	clear: _clear
};
