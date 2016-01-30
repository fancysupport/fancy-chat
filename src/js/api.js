function FancyAPI(url, key, sig, customer_id) {
	this.url = url;
	this.key = key;
	this.sig = sig;
	this.customer_id = customer_id;

	// general http fn
	this.request = function(opts, cb) {
		var r = new XMLHttpRequest();
		r.open(opts.method, this.url+opts.path, true);

		if (opts.json) {
			r.setRequestHeader('Content-type', 'application/json');
			opts.data = JSON.stringify(opts.data);
		} else {
			r.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		}

		r.setRequestHeader('Cache-Control', 'no-cache');
		r.setRequestHeader('Pragma', 'no-cache');
		if (detectIE()) r.setRequestHeader('If-Modified-Since', 'Sat, 01 Jan 2000 00:00:00 GMT');
		r.setRequestHeader('X-App-Key', this.key);
		r.setRequestHeader('X-Signature', this.sig);
		r.setRequestHeader('X-Customer-Id', this.customer_id);

		r.onreadystatechange = function () {
			if (r.readyState === 4 && cb) {
				var response = {code: req.status};
				try {
					response.data = JSON.parse(req.responseText);
				} catch (e) {
					response.data = req.responseText;
				}

				if (r.status >= 200 && r.status < 300) {
					cb(response);
				} else {
					cb(null, response.error || response);
				}
			}
		};

		r.send(opts.data);
	};

	// get the payload
	// includes settings for showing names and app details
	// last X messages
	// also records an impression for convenience
	this.get_payload = function(cb) {
		this.request({
			method: 'GET',
			path: '/payload'
		}, cb);
	};

	// get messages 
	this.get_messages = function(cb) {
		this.request({
			method: 'GET',
			path: '/messages'
		}, cb);
	};
	
	// acknowledge messages 
	this.read_messages = function(cb) {
		this.request({
			method: 'POST',
			path: '/read'
		}, cb);
	};
	
	// send a message
	this.message = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/messages',
			data: data,
			json: true
		}, cb);
	};

	// record an impression
	this.impression = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/impression',
			data: data,
			json: true
		}, cb);
	};

	// record an event
	this.event = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/event',
			data: data,
			json: true
		}, cb);
	};
}

function _get_settings(cb) {
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
							_USERS[id] = value;
					}
				}
			}

			if (cb) cb();
		}

		if (err) {
			if (err.code === 401)
				console.warn('FancySupport client got a 401 error and is shutting down, double check your signature and app key.');
			else
				console.warn('FancySupport client got a ' + err.code + ' error and is shutting down.');

			_clear();
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
	if ( ! opts || ! opts.name) return console.error('FancySupport.event() needs an object with a name field at minimum.');

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

