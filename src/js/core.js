var FancySupport = {
	node_textarea: null,
	node_chat: null,
	node_listings: null,

	node_unread: null,

	old_onerror: null,
	email_md5: '',

	user: {},
	users: {}, // id/name map for customer and staff
	active: null,
	threads: [],
	url: 'http://api.fancysupport.com:4000/client',

	id: function(id) {
		return document.getElementById(id);
	},

	build_query_string: function(obj) {
		var s = [];
		for (var p in obj) {
			if (obj.hasOwnProperty(p) && obj[p] !== undefined) {
				s.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			}
		}
		return s.join("&");
	},

	has_class: function(node, c) {
		return -1 < node.className.indexOf(c);
	},

	add_class: function(node, c) {
		if (node && ! this.has_class(node, c))
			node.className += ' ' + c;
	},

	remove_class: function(node, c) {
		if (node && this.has_class(node, c)) {
			var classes = node.className.split(' ');
			classes.splice(classes.indexOf(c), 1);
			node.className = classes.join(' ');
		}
	},

	addEvent: function(event, node, fn) {
		if (node.addEventListener)
			node.addEventListener(event, fn);
		else if (node.attachEvent)
			node.attachEvent('on'+event, fn);
	},

	init: function(options) {
		var that = this;

		this.old_onerror = window.onerror;
		var new_onerror = function(error, file, line) {
			var s = '';

			s += error||'' + '\n';
			s += file||'' + '\n';
			s += line||'';

			try {
				that.error_event('error', s);
			} catch(ex) {}

			if (that.old_onerror) that.old_onerror.apply(this, arguments);
		};

		if (options.log_errors) window.onerror = new_onerror;

		if (options.unread_counter)
			this.node_unread = document.querySelector(options.unread_counter);

		this.user = {
			signature: options.signature,
			app_key: options.app_key,
			name: options.name,
			email: options.email,
			phone: options.phone,
			customer_id: options.customer_id,
			avatar: options.avatar,
			default_avatar: options.default_avatar
		};

		this.impression();
		this.get_settings();
		this.get_messages();

		// perform this once
		this.email_md5 = this.md5(this.user.email);

		this.users[''] = this.user.name;

		setInterval(function() {
			that.get_messages();
		}, 10*60*1000);

		this.addEvent('click', document.querySelector(options.activator), function() {
			that.render_widget();
			that.render_new_chat();

			if (that.active) {
				// get something out quick
				that.render_existing_chat();

				// get the most recent version of active
				that.update_active(function() {
					that.render_existing_chat();
				});
			} else {
				// get new versions on open
				that.get_messages();
			}
		});

		String.prototype.encodeHTML = function() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}();
	},

	get_avatar: function(id) {
		var d = 'mm';

		// if there's a default image given, or one of gravatars, use that
		if (this.user.default_avatar) d = this.user.default_avatar;

		// if there's an id, it's a fancy dude
		if (id)
			return this.app_icon ? 'http://cdn.fancy.support/'+this.app_icon : 'https://secure.gravatar.com/avatar/?d=' + d;

		// use the avatar they gave us if available
		if (this.user.avatar) return this.user.avatar;

		return 'https://secure.gravatar.com/avatar/' + this.email_md5 + '?d=' + d;
	},

	impression: function() {
		if ( ! this.user)
			throw "Fancy needs a user object to run.";

		if ( ! this.user.signature)
			throw "Fancy needs a customer signature field: signature";

		if ( ! this.user.app_key)
			throw "Fancy needs an application key field: app_key.";

		if ( ! this.user.customer_id)
			throw "Fancy needs a customer id field: customer_id.";

		var impression = this.build_query_string({
			signature: this.user.signature,
			app_key: this.user.app_key,
			customer_id: this.user.customer_id,
			name: this.user.name,
			email: this.user.email,
			phone: this.user.phone
		});

		this.ajax({method: 'POST', url: '/impression', data: impression});
	},

	info_event: function(name, desc) {
		this.event(name, desc, 'info');
	},

	warning_event: function(name, desc) {
		this.event(name, desc, 'warning');
	},

	error_event: function(name, desc) {
		this.event(name, desc, 'critical');
	},

	event: function(name, desc, level) {
		if ( ! name) return; // no event, so go home

		level = level || 'info';

		// set them all to strings since numbers produce errors
		var event = {
			customer_id: this.user.customer_id,
			name: ''+name,
			description: ''+desc,
			level: ''+level
		};

		this.ajax({
			method: 'POST',
			url: '/events',
			data: event,
			json: true
		});
	},

	get_settings: function() {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/settings'
		}, function(ok, err) {
			if (ok && ok.data) {
				for (var id in ok.data) {
					if (ok.data.hasOwnProperty(id) && ok.data[id] !== undefined) {
						var value = ok.data[id];

						switch(id) {
							case 'app_icon':
								that.app_icon = value; break;

							case 'app_name':
								that.app_name = value; break;

							default:
								that.users[id] = value;
						}
					}
				}
			}
		});
	},

	get_messages: function(cb) {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/messages'
		}, function(ok, err) {
			if (ok) {
				that.threads = ok.data;
				that.check_updates();
				if (cb) cb();
			}
		});
	},

	check_updates: function() {
		var updates = 0;

		for (var i=0; i<this.threads.length; i++) {
			var thread = this.threads[i];
			var last_read = thread.last_read;

			for (var j=0; j<thread.replies.length; j++) {
				var reply = thread.replies[j];

				if (reply.created > last_read) {
					updates++;
					thread.unread = true;
				}
			}
		}

		if (updates > 0 && this.node_unread)
			this.node_unread.innerHTML = updates;
	},

	update_active: function(cb) {
		var that = this;

		this.get_messages(function() {
			if ( ! that.active) return;
			// reassign the active conversation
			for (var i=0; i<that.threads.length; i++) {
				if (that.active.id === that.threads[i].id) {
					that.active = that.threads[i];
				}
			}

			if (cb) cb();
		});
	},

	update_read: function(cb) {
		var that = this;

		if ( ! this.active) return;

		this.ajax({
			method: 'POST',
			url: '/messages/' + this.active.id + '/read'
		});

		if (cb) cb();
	},

	click_send: function() {
		var that = this;
		var message = this.node_textarea.value;
		this.node_textarea.value = '';

		if (message === '') return;

		var data = {
			content: message,
			customer_id: this.user.customer_id
		};

		if (this.active) { // replying to an existing conversation
			this.ajax({
				method: 'POST',
				url: '/messages/' + this.active.id + '/reply',
				data: data,
				json: true
			}, function(ok, err) {
				if (ok) {
					// set some things on the data object so ui updates right
					data.incoming = true;
					data.created = Math.floor(new Date().getTime()/1000);
					data.user_id = '';
					that.active.replies.push(data);

					that.render_existing_chat();

					that.update_active(function() {
						that.render_existing_chat();
					});
				}
			});
		} else {  // creating a new conversation
			// sending initial message requests the customer name
			data.customer_name = this.user.name;

			this.ajax({
				method: 'POST',
				url: '/messages',
				data: data,
				json: true
			}, function(ok, err) {
				if (ok) {
					ok.data.replies = [];
					that.active = ok.data;
					that.threads.push(that.active);
					that.render_existing_chat();
				}
			});
		}
	},

	click_chats_update: function() {
		var that = this;
		this.render_listings();
		this.render_header({title: 'Previous Messages', which: 'fancy-icon-pencil'});

		this.active = null;

		var fn = function() {
			var id = this.getAttribute("data-id");
			that.active = that.threads[id];

			that.render_new_chat();
			that.render_existing_chat();
		};

		var convos = document.querySelectorAll('.listing');
		for (var i=0; i<convos.length; i++) {
			this.addEvent('click', convos[i], fn);
		}
	},

	click_chats: function() {
		var that = this;

		// show what we have so its quick
		this.click_chats_update();

		// get new stuff too so it right
		this.get_messages(function() {
			that.click_chats_update();
		});
	},

	render_widget: function() {
		// append the widget to the end of the body, check to make sure
		// it hasn't already been created, if it has, recreate
		var div = this.id('fancy-chat');
		if ( ! div) {
			div = document.createElement('div');
			div.id = 'fancy-chat';
			document.body.appendChild(div);
		}

		div.innerHTML = this.templates.widget();

		this.node_chat = document.querySelector('#fancy-chat .chat');
		this.node_listings = this.id('fancy-listings');
	},

	render_header: function(data) {
		var that = this;
		var div = this.id('fancy-header');

		div.innerHTML = this.templates.header(data);

		var chatsFn = function() { that.click_chats(); };
		var newFn = function() { that.render_new_chat(); };

		this.addEvent('click', this.id('fancy-newchats'), data.which == 'fancy-icon-pencil' ? newFn : chatsFn);

		this.addEvent('click', this.id('fancy-close'), function() {
			that.remove_widget();
		});
	},

	render_new_chat: function() {
		var that = this;

		this.render_header({title: 'New Message to ' + this.app_name, which: 'fancy-icon-list'});

		this.node_chat.innerHTML = this.templates.chat();
		this.remove_class(this.node_chat, 'fancy-hide');

		this.node_listings.innerHTML = '';
		this.add_class(this.node_listings, 'fancy-hide');

		this.node_textarea = this.id('fancy-textarea');
		this.messages = this.id('fancy-messages');

		this.addEvent('click', this.id('fancy-send'), function() {
			that.click_send();
		});
	},

	render_existing_chat: function(data) {
		var that = this;

		this.render_header({title: 'New Message to ' + this.app_name, which: 'fancy-icon-list'});

		// since we're viewing it, update the read field
		this.update_read(function() {
			that.update_active();
		});

		var div = this.id('fancy-messages');

		div.innerHTML = this.templates.messages(this.active);
		div.scrollTop = div.scrollHeight;
	},

	render_listings: function() {
		this.node_listings.innerHTML = this.templates.listings(this.threads);
		this.remove_class(this.node_listings, 'fancy-hide');

		this.node_chat.innerHTML = '';
		this.add_class(this.node_chat, 'fancy-hide');
	},

	remove_widget: function() {
		document.body.removeChild(this.id('fancy-chat'));
		this.messages = null;
		this.node_textarea = null;
	},

	ajax: function (opts, cb) {
		var that = this;

		var parse = function (req) {
			var result;
			try {
				result = JSON.parse(req.responseText);
			} catch (e) {
				result = req.responseText;
			}
			return {code: req.status, data: result};
		};

		var XHR = XMLHttpRequest || ActiveXObject;
		var request = new XHR('MSXML2.XMLHTTP.3.0');
		request.open(opts.method, that.url+opts.url, true);

		if (opts.json) {
			request.setRequestHeader('Content-type', 'application/json');
			opts.data = JSON.stringify(opts.data);
		} else
			request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

		request.setRequestHeader('X-App-Key', that.user.app_key);
		request.setRequestHeader('X-Customer-Id', that.user.customer_id);
		request.setRequestHeader('X-Signature', that.user.signature);

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
	},

	timeago: function(time) {
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

			return (time <= local)  ? span + ' ago' : 'in ' + span;
	}
};
