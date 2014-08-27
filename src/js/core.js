var FancySupport = {
	msgBox: null,
	chat: null,
	convos: null,
	current: null,
	conversations: [],
	url: 'http://api.fancysupport.com:4000',

	cache: function() {
		// dummy data
		for (var i=1; i<5; i++) {
			var data = {
				customer: 123,
				direction: 'in',
				sender: 123,
				content: 'conv ' + i,
				replies: []
			};

			for (var j=0; j<15; j++) {
				var reply = {
					customer: i,
					direction: Math.random() > 0.5 ? 'in' : 'out',
					sender: i,
					content: j
				};

				data.replies.push(reply);
			}

			this.conversations.push(data);
		}
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

	init: function() {
		var that = this;

		this.impression();

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

		//this.cache();
	},

	impression: function() {
		if ( ! FancyUser)
			throw "Fancy needs a FancyUser object to run.";

		if ( ! FancyUser.signature)
			throw "FancyUser needs a customer signature.";

		if ( ! FancyUser.app_key)
			throw "FancyUser needs a application key.";

		var impression = this.build_query_string({
			signature: FancyUser.signature,
			app_key: FancyUser.app_key,
			customer_id: FancyUser.customer_id,
			name: FancyUser.name,
			email: FancyUser.email,
			phone: FancyUser.phone
		});

		this.ajax({method: 'post', url: '/impression', data: impression}, function(ok, err) {
			console.log(ok, err);
		});
	},

	onSendClick: function() {
		var message = this.msgBox.value;
		this.msgBox.value = '';

		if (message !== '') {
			if (this.current) { // replying to an existing conversation
				var reply = {
					customer: 'me', // FIXME
					sender: 'me', // FIXME
					direction: 'in',
					content: message
				};

				this.current.replies.push(reply);
			} else {  // creating a new conversation
				this.current = {
					customer_id: FancyUser.customer_id,
					customer_name: FancyUser.name,
					sender: 'me', // FIXME
					direction: 'in', // FIXME
					incomming: true,
					content: message,
					replies: []
				};

				this.conversations.push(this.current);
				this.ajax({method: 'post', url: '/messages', data: this.current, json: true}, function(ok, err) {
					console.log(ok, err);
				});
			}

			this.renderMessages(this.current);

			// TODO: send message to server
		}
	},

	onChatsClick: function() {
		this.renderConvos();
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

		var convos = document.querySelectorAll('.convo');
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

		this.chat = document.querySelector('#fancy-chat .chat');
		this.convos = document.querySelector('#fancy-chat .convos');
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

		this.chat.innerHTML = this.templates.chat();
		this.convos.innerHTML = '';

		var btnSend = document.getElementById('fancy-send');
		this.msgBox = document.getElementById('fancy-message');
		this.messages = document.getElementById('fancy-messages');

		btnSend.addEventListener('click', function() {
			that.onSendClick();
		});
	},

	renderConvos: function() {
		this.convos.innerHTML = this.templates.convos(this.conversations);
		this.chat.innerHTML = '';
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
		this.msgBox = null;
	},

	ajax: function(opts, cb) {
		var fn = function(data, xhr) {
			cb({code: xhr.status, data: data});
		};

		atomic[opts.method](this.url+opts.url, opts.data, opts.json)
			.success(fn)
			.error(fn);
	}
};

(function(root) {
	root.FancySupport.init();
})(this);
