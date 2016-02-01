var _CLICK_HANDLER; // activator click function
var _OLD_ONERROR; // previous value of window.onerror
var _URL_HOST = 'https://api.fancysupport.com';
var _URL_PORT = '';
if (window.location.hostname === 'local.fancysupport.com') {
	_URL_HOST = window.location.protocol+'//local.fancysupport.com';
	_URL_PORT = ':4000';
}
var _URL = _URL_HOST + _URL_PORT + '/client';
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

var view;

function _CLICK_HANDLER() {
	if ( ! _INITTED) return;

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
}

function _get_avatar(id) {
	var d = 'mm';

	// if there's a default image given, or one of gravatars, use that
	if (_SETTINGS.default_avatar) d = _SETTINGS.default_avatar;

	// if there's an id, it's a fancy dude
	if (id)
		return _APP_ICON ? '//cdn.fancy.support/' + _APP_ICON : 'https://secure.gravatar.com/avatar/?d=' + d;

	// use the avatar they gave us if available
	if (_USER.avatar) return _USER.avatar;

	return 'https://secure.gravatar.com/avatar/' + _EMAIL_MD5 + '?d=' + d;
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

function _finish_init() {
	// perform this once
	_EMAIL_MD5 = md5(_USER.email);

	// preload avatar
	var img = new Image();
	img.src = _get_avatar();

	_USERS[''] = _USER.name;

	_FETCH_INTERVAL = setInterval(function() {
		_get_messages();
	}, 10*60*1000);

	FancySupport.attach();

	String.prototype.encodeHTML = function() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
		matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}();

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

	if (_SETTINGS.log_errors) window.onerror = new_onerror;

	_INITTED = true;

	_impression();
	_get_messages();
}

// make available to client
FancySupport.init = function init(options) {
	// don't run on ie < 9
	if (detectIE() && detectIE() < 9) {
		console.warn('FancySupport: does not work in IE < 9.');
		return;
	}
	
	if (typeof options !== 'object') {
		console.error('FancySupport: requires a config object.');
		return;
	}

	if ( ! options.signature) {
		console.error('FancySupport: missing required signature in options.');
		return;
	}

	if ( ! options.app_key) {
		console.error('FancySupport: missing required app_key in options.');
		return;
	}

	if ( ! options.customer_id) {
		console.error('FancySupport: missing required customer_id in options.');
		return;
	}

	if (options.custom_data && typeof options.custom_data !== 'object') {
		console.error('FancySupport: custom_data needs to be an object.');
	}
	
	// init the store
	var store = new Store();
	store.default_activator = !options.hide_default_activator;
	store.activator_selector = options.activator || null;
	store.counter_selector = options.counter || null;

	// set customer details
	store.customer = {
		customer_id: options.customer_id,
		name: options.name,
		email: options.email,
		phone: options.phone
	};

	if (options.custom_data) store.customer.custom_data = options.custom_data;

	// init render engine, remove if we have one already
	if (view) view.teardown();
	view = new View(store);
	view.init();

};

FancySupport.initold = function init(options) {

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
		unread_counter: options.unread_counter || '#fancy-unread-counter',
		log_errors: options.log_errors
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

	_get_settings(_finish_init);
};

// make available to client
FancySupport.clear = function clear() {
	if (_INITTED) {
		_remove_activator();

		if (_SETTINGS.unread_counter) {
			var node = document.querySelector(_SETTINGS.unread_counter);
			if (node) node.innerHTML = '';
		}

		_set_defaults();
		_remove_widget();
		window.onerror = _OLD_ONERROR || function(){};

		_INITTED = false;
	}
};

// make available to client
FancySupport.attach = function attach(selector) {
	selector = selector || _SETTINGS.activator;

	// update _SETTINGS with possible new value
	_SETTINGS.activator = selector;

	// chat functionality is disabled
	if (selector === false) return;

	// using default activator
	if (selector === true || selector === undefined) {
		selector = '#fancy-activator';
		_render_default_activator();
	}

	add_event('click', document.querySelector(selector), _CLICK_HANDLER);
};

// TODO fix these too
FancySupport.impression = _impression;
FancySupport.event = _event;
