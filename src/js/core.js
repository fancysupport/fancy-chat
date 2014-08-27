var FancySupport = {
	node_message: null,
	node_chat: null,
	node_listings: null,

	current: null,
	conversations: [],
	url: 'http://api.fancysupport.com:4000',

	build_query_string: function(obj) {
		var s = [];
		for (var p in obj) {
			if (obj.hasOwnProperty(p) && obj[p] !== undefined) {
				s.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
			}
		}
		return s.join("&");
	},

	init: function() {
		var that = this;

		this.impression();

		this.get_messages();

		document.querySelector(FancyUser.activator)
		.addEventListener('click', function() {
			that.renderWidget();
			that.renderChat();
		});

		function encodeHTMLSource() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}
		String.prototype.encodeHTML = encodeHTMLSource();
	},

	impression: function() {
		if ( ! FancyUser)
			throw "Fancy needs a FancyUser object to run.";

		if ( ! FancyUser.signature)
			throw "FancyUser needs a customer signature field: signature";

		if ( ! FancyUser.app_key)
			throw "FancyUser needs an application key field: app_key.";

		if ( ! FancyUser.customer_id)
			throw "FancyUser needs a customer id field: customer_id."

		var impression = this.build_query_string({
			signature: FancyUser.signature,
			app_key: FancyUser.app_key,
			customer_id: FancyUser.customer_id,
			name: FancyUser.name,
			email: FancyUser.email,
			phone: FancyUser.phone
		});

		this.ajax({method: 'POST', url: '/impression', data: impression});
	},

	onSendClick: function() {
		var that = this;
		var message = this.node_message.value;
		this.node_message.value = '';

		if (message === '') return;

		var qs = this.build_query_string({
			app_key: FancyUser.app_key,
			signature: FancyUser.signature,
			customer_id: FancyUser.customer_id
		});

		var data = {
			content: message,
			customer_id: FancyUser.customer_id,
		};

		if (this.current) { // replying to an existing conversation
			this.ajax({
				method: 'POST',
				url: '/messages/' + this.current.id + '/reply?' + qs,
				data: data,
				json: true
			}, function(ok, err) {
				console.log(ok, err);
				if (ok) {
					data.incoming = true;
					that.current.replies.push(data);
					that.renderMessages(that.current);
				}
			});
		} else {  // creating a new conversation
			this.ajax({method: 'POST', url: '/messages?'+qs, data: data, json: true}, function(ok, err) {
				console.log(ok, err);
				if (ok) {
					ok.data.replies = [];
					that.current = ok.data;
					that.conversations.push(that.current);
					that.renderMessages(that.current);
				}
			});
		}
	},

	onChatsClick: function() {
		this.renderListings();
		this.renderHeader({title: 'previous chats', which: 'new'});

		this.current = null;

		var that = this;

		var fn = function() {
			// TODO check for new data?

			var id = this.getAttribute("data-id");
			that.current = that.conversations[id];

			that.renderChat();
			that.renderMessages(that.current);
		};

		var convos = document.querySelectorAll('.listing');
		for (var i=0; i<convos.length; i++) {
			convos[i].addEventListener('click', fn);
		}
	},

	renderWidget: function() {
		// append the widget to the end of the body, check to make sure
		// it hasn't already been created, if it has, recreate
		var div = document.getElementById('fancy-chat');
		if ( ! div) {
			div = document.createElement('div');
			div.id = 'fancy-chat';
			document.body.appendChild(div);
		}

		div.innerHTML = this.templates.widget();

		this.node_chat = document.querySelector('#fancy-chat .chat');
		this.node_listings = document.querySelector('#fancy-chat .listings');
	},

	renderHeader: function(data) {
		var that = this;
		var div = document.querySelector('#fancy-chat .header');

		div.innerHTML = this.templates.header(data);

		var btnClose = document.getElementById('fancy-close');
		var btnNewChats = document.getElementById('fancy-newchats');

		var chatsFn = function() { that.onChatsClick(); };
		var newFn = function() {
			that.current = null;
			that.renderChat();
		};

		btnNewChats.addEventListener('click', data.which == 'new' ? newFn : chatsFn);

		btnClose.addEventListener('click', function() {
			that.removeWidget();
		});
	},

	renderChat: function() {
		var that = this;

		this.renderHeader({title: 'new chat', which: 'chats'});

		this.node_chat.innerHTML = this.templates.chat();
		this.node_listings.innerHTML = '';

		var btnSend = document.getElementById('fancy-send');
		this.node_message = document.getElementById('fancy-message');
		this.messages = document.getElementById('fancy-messages');

		btnSend.addEventListener('click', function() {
			that.onSendClick();
		});
	},

	renderListings: function() {
		this.node_listings.innerHTML = this.templates.listings(this.conversations);
		this.node_chat.innerHTML = '';
	},

	renderMessages: function(data) {
		this.renderHeader({title: 'existing chat', which: 'chats'});

		var div = document.getElementById('fancy-messages');

		div.innerHTML = this.templates.messages(data);
		div.scrollTop = div.scrollHeight;
	}, 

	removeWidget: function() {
		document.body.removeChild(document.getElementById('fancy-chat'));
		this.messages = null;
		this.node_message = null;
		this.current = null;
	},

	ajax: function(opts, cb) {
		var parse = function (req) {
			var result;
			try {
				result = JSON.parse(req.responseText);
			} catch (e) {
				result = req.responseText;
			}
			return [result, req];
		};
		
		var xhr = function (type, url, data, json) {
			var methods = {
				success: function () {},
				error: function () {}
			};
			var XHR = XMLHttpRequest || ActiveXObject;
			var request = new XHR('MSXML2.XMLHTTP.3.0');
			request.open(type, url, true);

			if (json) {
				request.setRequestHeader('Content-type', 'application/json');
				data = JSON.stringify(data);
			} else
				request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			
			request.onreadystatechange = function () {
				if (request.readyState === 4) {
					if (request.status >= 200 && request.status < 300) {
						methods.success.apply(methods, parse(request));
					} else {
						methods.error.apply(methods, parse(request));
					}
				}
			};
			request.send(data);
			var callbacks = {
				success: function (callback) {
					methods.success = callback;
					return callbacks;
				},
				error: function (callback) {
					methods.error = callback;
					return callbacks;
				}
			};

			return callbacks;
		};

		ajax = {};

		ajax.GET = function (src) {
			return xhr('GET', src);
		};

		ajax.PUT = function (url, data, json) {
			return xhr('PUT', url, data, json);
		};

		ajax.POST = function (url, data, json) {
			return xhr('POST', url, data, json);
		};

		ajax.DELETE = function (url) {
			return xhr('DELETE', url);
		};

		var fn = function(data, xhr) {
			if (cb) cb({code: xhr.status, data: data});
		};

		ajax[opts.method](this.url+opts.url, opts.data, opts.json)
			.success(fn)
			.error(fn);
	},

	get_messages: function() {
		var that = this;

		var qs = this.build_query_string({
			app_key: FancyUser.app_key,
			signature: FancyUser.signature,
			customer_id: FancyUser.customer_id
		});

		this.ajax({
			method: 'GET',
			url: '/messages?' + qs
		}, function(ok, err) {
			// TODO diff between previous to find new messages and show notification
			if (ok) {
				that.conversations = ok.data;
			}
		});
	},
};

FancySupport.init();
