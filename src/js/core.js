var _CLICK_HANDLER; // activator click function
var _OLD_ONERROR; // previous value of window.onerror
var _URL = 'http://api.fancysupport.com:4000/client';
var _APP_NAME;
var _APP_ICON;
var _CURRENT_VIEW;

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
	if (node.addEventListener)
		node.addEventListener(event, fn);
	else if (node.attachEvent)
		node.attachEvent('on'+event, fn);
}

function _remove_event(event, node, fn) {
	if (node.removeEventListener)
		node.removeEventListener(event, fn);
	else if (node.detachEvent)
		node.detachEvent('on'+event, fn);
}

function _set_defaults() {
	FancySupport.node_textarea = null;
	FancySupport.node_chat = null;
	FancySupport.node_listings = null;

	FancySupport.email_md5 = '';

	FancySupport.user = {}; // user information
	FancySupport.options = {}; // storing app key etc
	FancySupport.users = {}; // id/name map for customer and staff
	FancySupport.active = null;
	FancySupport.current_view = null;
	FancySupport.threads = [];

	_APP_NAME = '';
	_APP_ICON = '';
}

function _get_avatar(id) {
	var d = 'mm';

	// if there's a default image given, or one of gravatars, use that
	if (FancySupport.options.default_avatar) d = FancySupport.options.default_avatar;

	// if there's an id, it's a fancy dude
	if (id)
		return _APP_ICON ? 'http://cdn.fancy.support/' + _APP_ICON : 'https://secure.gravatar.com/avatar/?d=' + d;

	// use the avatar they gave us if available
	if (FancySupport.user.avatar) return FancySupport.user.avatar;

	return 'https://secure.gravatar.com/avatar/' + FancySupport.email_md5 + '?d=' + d;
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
			MONTH  = 2629744,
			YEAR   = 31556926;
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

	request.setRequestHeader('X-App-Key', FancySupport.options.app_key);
	request.setRequestHeader('X-Customer-Id', FancySupport.user.customer_id);
	request.setRequestHeader('X-Signature', FancySupport.options.signature);

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

	div.innerHTML = FancySupport.templates.widget();

	FancySupport.node_chat = document.querySelector('#fancy-chat .chat');
	FancySupport.node_listings = _id('fancy-listings');
}

function _render_header(data) {
	var div = _id('fancy-header');

	div.innerHTML = FancySupport.templates.header(data);

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
	FancySupport.node_chat.innerHTML = FancySupport.templates.chat(phrase + _APP_NAME);
	_remove_class(FancySupport.node_chat, 'fancy-hide');

	FancySupport.node_listings.innerHTML = '';
	_add_class(FancySupport.node_listings, 'fancy-hide');

	FancySupport.node_textarea = _id('fancy-textarea');
	FancySupport.messages = _id('fancy-messages');

	_add_event('click', _id('fancy-send'), function() {
		_click_send();
	});
}

function _render_existing_chat(data) {
	if (_CURRENT_VIEW !== 'existing') return;

	_render_new_chat(true);

	_render_header({title: _APP_NAME, which: 'fancy-icon-list'});

	// if this thread has unread messages, send a read call
	if (FancySupport.active.unread) {
		_update_read(function() {
			_update_active();
			_check_updates();
		});
	}

	var div = _id('fancy-messages');

	div.innerHTML = FancySupport.templates.messages(FancySupport.active);
	div.scrollTop = div.scrollHeight;
}

function _render_listings() {
	if (_CURRENT_VIEW !== 'listing') return;

	_render_header({title: _APP_NAME, which: 'fancy-icon-pencil'});

	FancySupport.threads.sort(function(a, b) {
		return (! a.unread && b.unread) || a.updated < b.updated;
	});

	FancySupport.node_listings.innerHTML = FancySupport.templates.listings(FancySupport.threads);
	_remove_class(FancySupport.node_listings, 'fancy-hide');

	FancySupport.node_chat.innerHTML = '';
	_add_class(FancySupport.node_chat, 'fancy-hide');
}

function _remove_widget() {
	_CURRENT_VIEW = null;
	FancySupport.messages = null;
	FancySupport.node_textarea = null;

	var chat = _id('fancy-chat');
	if (chat) document.body.removeChild(chat);
}

function _get_settings() {
	_ajax({
		method: 'GET',
		url: '/settings'
	}, function(ok, err) {
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
							FancySupport.users[id] = value;
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
	}, function(ok, err) {
		if (ok) {
			FancySupport.threads = ok.data;
			_check_updates();
			if (cb) cb();
		}
	});
}

function _has_unreads() {
	for (var i=0; i<FancySupport.threads.length; i++) {
		if (FancySupport.threads[i].unread) return true;
	}
}

function _check_updates() {
	var updates = 0;

	for (var i=0; i<FancySupport.threads.length; i++) {
		var thread = FancySupport.threads[i];
		var last_read = thread.last_read;

		for (var j=0; j<thread.replies.length; j++) {
			var reply = thread.replies[j];

			if (reply.created > last_read) {
				updates++;
				thread.unread = true;
			}
		}
	}

	if (updates === 0) updates = '';

	if (FancySupport.options.unread_counter) {
		var node = document.querySelector(FancySupport.options.unread_counter);
		node.innerHTML = updates;
	}
}

function _update_active(cb) {
	_get_messages(function() {
		if ( ! FancySupport.active) return;
		// reassign the active conversation
		for (var i=0; i<FancySupport.threads.length; i++) {
			if (FancySupport.active.id === FancySupport.threads[i].id) {
				FancySupport.active = FancySupport.threads[i];
			}
		}

		if (cb) cb();
	});
}

function _update_read(cb) {
	if ( ! FancySupport.active) return;

	_ajax({
		method: 'POST',
		url: '/messages/' + FancySupport.active.id + '/read'
	});

	if (cb) cb();
}

function _click_send() {
	var message = FancySupport.node_textarea.value;
	FancySupport.node_textarea.value = '';

	if (message === '') return;

	var data = {
		content: message
	};

	if (FancySupport.active) { // replying to an existing conversation
		_ajax({
			method: 'POST',
			url: '/messages/' + FancySupport.active.id + '/reply',
			data: data,
			json: true
		}, function(ok, err) {
			if (ok) {
				// set some things on the data object so ui updates right
				data.incoming = true;
				data.created = Math.floor(new Date().getTime()/1000);
				data.user_id = '';
				FancySupport.active.replies.push(data);

				_CURRENT_VIEW = 'existing';
				_render_existing_chat();

				_update_active(function() {
					_render_existing_chat();
				});
			}
		});
	} else {  // creating a new conversation
		// sending initial message requests the customer name
		data.customer_name = FancySupport.user.name;

		_ajax({
			method: 'POST',
			url: '/messages',
			data: data,
			json: true
		}, function(ok, err) {
			if (ok) {
				ok.data.replies = [];
				FancySupport.active = ok.data;
				FancySupport.threads.push(FancySupport.active);
				_CURRENT_VIEW = 'existing';
				_render_existing_chat();
			}
		});
	}
}

function _click_chats_update() {
	if (_CURRENT_VIEW !== 'listing') return;

	_render_listings();
	FancySupport.active = null;

	var fn = function(e) {
		var id = this.getAttribute("data-id");
		FancySupport.active = FancySupport.threads[id];

		_CURRENT_VIEW = 'existing';
		_render_existing_chat();
	};

	var convos = document.querySelectorAll('.listing');
	for (var i=0; i<convos.length; i++) {
		var e = convos[i];
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

var FancySupport = {
	init: function(options) {
		var that = this;

		if (typeof options !== 'object') {
			console.error("Fancy needs a config object to run.");
			return;
		}

		if ( ! options.signature) {
			console.error("Fancy needs a customer signature field: signature");
			return;
		}

		if ( ! options.app_key) {
			console.error("Fancy needs an application key field: app_key.");
			return;
		}

		if ( ! options.customer_id) {
			console.error("Fancy needs a customer id field: customer_id.");
			return;
		}

		// setup initial settings
		_set_defaults();

		this.options = {
			app_key: options.app_key,
			signature: options.signature,
			default_avatar: options.default_avatar,
			activator: options.activator,
			unread_counter: options.unread_counter
		};

		this.user.customer_id = options.customer_id;

		if (options.name) this.user.name = options.name;
		if (options.email) this.user.email = options.email;
		if (options.phone) this.user.phone = options.phone;
		if (options.avatar) this.user.avatar = options.avatar;

		if (options.custom_data) {
			if (typeof options.custom_data === 'object')
				this.user.custom_data = options.custom_data;
			else
				console.error('Fancy custom_data needs to be an object.');
		}

		_OLD_ONERROR = window.onerror;
		var new_onerror = function(error, file, line) {
			try {
				var e = {
					name: 'error',
				};

				if (error) e.desc = ''+error;

				if (file || line) {
					e.data = {};
					if (file) e.data.file = ''+file;
					if (line) e.data.line = ''+line;
				}

				that.event(e);
			} catch(ex) {}

			if (_OLD_ONERROR) _OLD_ONERROR.apply(this, arguments);
		};

		if (options.log_errors) window.onerror = new_onerror;

		this.impression();
		_get_settings();
		_get_messages();

		// perform this once
		this.email_md5 = this.md5(this.user.email);

		// preload avatar
		var img = new Image();
		img.src = _get_avatar();

		this.users[''] = this.user.name;

		setInterval(function() {
			_get_messages();
		}, 10*60*1000);

		// save a reference to this function because we need it for when we unlisten
		_CLICK_HANDLER = function() {
			_render_widget();

			if (that.active) {
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

		_add_event('click', document.querySelector(this.options.activator), _CLICK_HANDLER);

		String.prototype.encodeHTML = function() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}();
	},

	impression: function() {
		var impression = {};

		if (this.user.name) impression.name = this.user.name;
		if (this.user.email) impression.email = this.user.email;
		if (this.user.phone) impression.phone = this.user.phone;
		if (this.user.custom_data) impression.custom_data = this.user.custom_data;
		impression.resolution = [window.innerWidth, window.innerHeight];

		_ajax({method: 'POST', url: '/impression', data: impression, json: true});
	},

	event: function(opts, cb) {
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
	},

	clear: function() {
		_remove_event('click', document.querySelector(this.options.activator), _CLICK_HANDLER);
		_set_defaults();
		_remove_widget();
		// FIXME put old onerror back
	}
};
