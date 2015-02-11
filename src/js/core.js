var FancySupport = {
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

	indexOf: function(arr, e) {
		for (var i=0; i<arr.length; i++) {
			if (arr[i] === e) return i;
		}

		return -1;
	},

	has_class: function(node, c) {
		var classes = node.className.split(' ');
		return -1 < FancySupport.indexOf(classes, c);
	},

	add_class: function(node, c) {
		if (node && ! this.has_class(node, c))
			node.className += ' ' + c;
	},

	remove_class: function(node, c) {
		if (node && this.has_class(node, c)) {
			var classes = node.className.split(' ');
			classes.splice(FancySupport.indexOf(classes, c), 1);
			node.className = classes.join(' ');
		}
	},

	addEvent: function(event, node, fn) {
		if (node.addEventListener)
			node.addEventListener(event, fn);
		else if (node.attachEvent)
			node.attachEvent('on'+event, fn);
	},

	removeEvent: function(event, node, fn) {
		if (node.removeEventListener)
			node.removeEventListener(event, fn);
		else if (node.detachEvent)
			node.detachEvent('on'+event, fn);
	},

	set_defaults: function() {
		this.node_textarea = null;
		this.node_chat = null;
		this.node_listings = null;

		this.old_onerror = null;
		this.email_md5 = '';

		this.user = {}; // user information
		this.options = {}; // storing app key etc
		this.users = {}; // id/name map for customer and staff
		this.active = null;
		this.current_view = null;
		this.threads = [];
	},

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
		this.set_defaults();

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

		this.old_onerror = window.onerror;
		var new_onerror = function(error, file, line) {
			try {
				that.event({
					name: 'error',
					desc: 'A JavaScript error occured on the client.',
					data: {
						error: error||'',
						file: file||'',
						line: line||''
					}
				});
			} catch(ex) {}

			if (that.old_onerror) that.old_onerror.apply(this, arguments);
		};

		if (options.log_errors) window.onerror = new_onerror;

		this.impression();
		this.get_settings();
		this.get_messages();

		// perform this once
		this.email_md5 = this.md5(this.user.email);

		// preload avatar
		var img = new Image();
		img.src = this.get_avatar();

		this.users[''] = this.user.name;

		setInterval(function() {
			that.get_messages();
		}, 10*60*1000);

		// save a reference to this function because we need it for when we unlisten
		this.click_handler = function() {
			that.render_widget();

			if (that.active) {
				// get something out quick
				that.current_view = 'existing';
				that.render_existing_chat();

				// get the most recent version of active
				that.update_active(function() {
					that.render_existing_chat();
				});
			} else {
				if (that.has_unreads()) {
					that.click_chats();
				} else {
					// get new versions on open
					that.render_new_chat();
					that.get_messages();
				}
			}
		};

		this.addEvent('click', document.querySelector(this.options.activator), this.click_handler);

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
		if (this.options.default_avatar) d = this.options.default_avatar;

		// if there's an id, it's a fancy dude
		if (id)
			return this.app_icon ? 'http://cdn.fancy.support/'+this.app_icon : 'https://secure.gravatar.com/avatar/?d=' + d;

		// use the avatar they gave us if available
		if (this.user.avatar) return this.user.avatar;

		return 'https://secure.gravatar.com/avatar/' + this.email_md5 + '?d=' + d;
	},

	impression: function() {
		var impression = {};

		if (this.user.name) impression.name = this.user.name;
		if (this.user.email) impression.email = this.user.email;
		if (this.user.phone) impression.phone = this.user.phone;
		if (this.user.custom_data) impression.custom_data = this.user.custom_data;

		this.ajax({method: 'POST', url: '/impression', data: impression, json: true});
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

		this.ajax({
			method: 'POST',
			url: '/events',
			data: event,
			json: true
		}, cb);
	},

	clear: function() {
		this.removeEvent('click', document.querySelector(this.options.activator), this.click_handler);
		this.set_defaults();
		this.remove_widget();
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
								that.app_icon = value;
								var img = new Image();
								img.src = that.get_avatar(true);
								break;

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

	has_unreads: function() {
		for (var i=0; i<this.threads.length; i++) {
			if (this.threads[i].unread) return true;
		}
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

		if (updates === 0) updates = '';

		if (this.options.unread_counter) {
			var node = document.querySelector(this.options.unread_counter);
			node.innerHTML = updates;
		}
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
			content: message
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

					that.current_view = 'existing';
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
					that.current_view = 'existing';
					that.render_existing_chat();
				}
			});
		}
	},

	click_chats_update: function() {
		if (this.current_view !== 'listing') return;

		var that = this;

		this.render_listings();
		this.active = null;

		var fn = function(e) {
			var id = this.getAttribute("data-id");
			that.active = that.threads[id];

			that.current_view = 'existing';
			that.render_existing_chat();
		};

		var convos = document.querySelectorAll('.listing');
		for (var i=0; i<convos.length; i++) {
			var e = convos[i];
			//this.addEvent('click', convos[i], fn);
			// FIXME this is shit, can't get the correct element to get data-id from
			convos[i].onclick = fn;
		}
	},

	click_chats: function() {
		var that = this;

		// show what we have so it's quick
		that.current_view = 'listing';
		this.click_chats_update();

		// get new stuff too so it's right
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

	render_new_chat: function(reply) {
		this.current_view = 'new';
		var that = this;

		// don't need to render this if we're just going to overwrite it
		if ( ! reply) this.render_header({title: 'New Message', which: 'fancy-icon-list'});

		var phrase = reply ? 'Reply to ' : 'Send a message to ';
		this.node_chat.innerHTML = this.templates.chat(phrase + this.app_name);
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
		if (this.current_view !== 'existing') return;

		this.render_new_chat(true);

		var that = this;

		this.render_header({title: this.app_name, which: 'fancy-icon-list'});

		// if this thread has unread messages, send a read call
		if (this.active.unread) {
			this.update_read(function() {
				that.update_active();
				that.check_updates();
			});
		}

		var div = this.id('fancy-messages');

		div.innerHTML = this.templates.messages(this.active);
		div.scrollTop = div.scrollHeight;
	},

	render_listings: function() {
		if (this.current_view !== 'listing') return;

		this.render_header({title: this.app_name, which: 'fancy-icon-pencil'});

		this.threads.sort(function(a, b) {
			return (! a.unread && b.unread) || a.updated < b.updated;
		});

		this.node_listings.innerHTML = this.templates.listings(this.threads);
		this.remove_class(this.node_listings, 'fancy-hide');

		this.node_chat.innerHTML = '';
		this.add_class(this.node_chat, 'fancy-hide');
	},

	remove_widget: function() {
		this.current_view = null;
		this.messages = null;
		this.node_textarea = null;

		var chat = this.id('fancy-chat');
		if (chat) document.body.removeChild(chat);
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

		if (opts.method === 'GET') opts.url += '?bust=' + (new Date()).getTime();

		var XHR = XMLHttpRequest || ActiveXObject;
		var request = new XHR('MSXML2.XMLHTTP.3.0');
		request.open(opts.method, that.url+opts.url, true);

		if (opts.json) {
			request.setRequestHeader('Content-type', 'application/json');
			opts.data = JSON.stringify(opts.data);
		} else
			request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

		request.setRequestHeader('X-App-Key', that.options.app_key);
		request.setRequestHeader('X-Customer-Id', that.user.customer_id);
		request.setRequestHeader('X-Signature', that.options.signature);

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

			return span + ' ago';
	}
};
