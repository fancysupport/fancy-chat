var FancySupport = {
	node_textarea: null,
	node_chat: null,
	node_listings: null,

	user: {},
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

	init: function(options) {
		var that = this;

		this.user = options;

		this.impression();
		this.get_messages();

		setInterval(function() {
			that.get_messages();
		}, 10*60*1000);

		document.querySelector(options.activator)
		.addEventListener('click', function() {
			that.render_widget();
			that.render_new_chat();

			if (that.active) that.render_existing_chat();
		});

		String.prototype.encodeHTML = function() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}();
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

	get_messages: function() {
		var that = this;

		this.ajax({
			method: 'GET',
			url: '/messages'
		}, function(ok, err) {
			// TODO diff between previous to find new messages and show notification
			if (ok) {
				that.threads = ok.data;
			}
		});
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
					data.incoming = true;
					that.active.replies.push(data);
					that.render_existing_chat();
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

	click_chats: function() {
		this.render_listings();
		this.render_header({title: 'previous chats', which: 'new'});

		this.active = null;

		var that = this;

		var fn = function() {
			var id = this.getAttribute("data-id");
			that.active = that.threads[id];

			that.render_new_chat();
			that.render_existing_chat();
		};

		var convos = document.querySelectorAll('.listing');
		for (var i=0; i<convos.length; i++) {
			convos[i].addEventListener('click', fn);
		}
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

		this.id('fancy-newchats').addEventListener('click', data.which == 'new' ? newFn : chatsFn);

		this.id('fancy-close').addEventListener('click', function() {
			that.remove_widget();
		});
	},

	render_new_chat: function() {
		var that = this;

		this.render_header({title: 'new chat', which: 'chats'});

		this.node_chat.innerHTML = this.templates.chat();
		this.node_listings.innerHTML = '';

		this.node_textarea = this.id('fancy-textarea');
		this.messages = this.id('fancy-messages');

		this.id('fancy-send').addEventListener('click', function() {
			that.click_send();
		});
	},

	render_existing_chat: function(data) {
		this.render_header({title: 'existing chat', which: 'chats'});

		var div = this.id('fancy-messages');

		div.innerHTML = this.templates.messages(this.active);
		div.scrollTop = div.scrollHeight;
	}, 

	render_listings: function() {
		this.node_listings.innerHTML = this.templates.listings(this.threads);
		this.node_chat.innerHTML = '';
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
				local = new Date().getTime()/1000,
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
			else if (offset < (HOUR * 24))     span = [ Math.round(Math.abs(offset / HOUR)), 'hr' ];
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
