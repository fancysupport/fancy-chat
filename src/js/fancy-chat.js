var FancyChat = {
	msgBox: null,
	chat: null,
	convos: null,
	current: null,
	conversations: [],

	cache: function() {
		// dummy data
		for(var i=1; i<5; i++) {
			var data = {
				customer: 123,
				direction: 'in',
				sender: 123,
				content: 'conv ' + i,
				replies: []
			};

			for(var j=0; j<15; j++) {
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

	init: function(options) {
		var self = this;
		// TODO options

		document.querySelector(options.activator)
		.addEventListener('click', function() {
			self.renderWidget();
			self.renderChat();
		});

		function encodeHTMLSource() {
			var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
			return function() {
				return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
			};
		}
		String.prototype.encodeHTML = encodeHTMLSource();

		this.cache();
	},

	onSendClick: function() {
		var message = this.msgBox.value;
		this.msgBox.value = '';

		if(message !== '') {
			if(this.current) { // replying to an existing conversation
				var reply = {
					customer: 'me', // FIXME
					sender: 'me', // FIXME
					direction: 'in',
					content: message
				};

				this.current.replies.push(reply);
			} else {  // creating a new conversation
				this.current = {
					customer: 'me', // FIXME
					sender: 'me', // FIXME
					direction: 'in',
					content: message,
					replies: []
				};

				this.conversations.push(this.current);
			}

			this.renderMessages(this.current);

			// TODO: send message to server
		}
	},

	onChatsClick: function() {
		this.renderConvos();
		this.renderHeader({title: 'previous chats', which: 'new'});

		this.current = null;

		var self = this;

		var fn = function() {
			// TODO check for new data?

			var id = this.getAttribute("data-id");
			self.current = self.conversations[id];

			self.renderChat();
			self.renderMessages(self.current);
		};

		var convos = document.querySelectorAll('.convo');
		for(var i=0; i<convos.length; i++) {
			convos[i].addEventListener('click', fn);
		}
	},

	renderWidget: function() {
		// append the widget to the end of the body, check to make sure
		// it hasn't already been created, if it has, recreate
		var div = document.getElementById('fancy-chat');
		if(!div) {
			div = document.createElement('div');
			div.id = 'fancy-chat';
			document.body.appendChild(div);
		}

		div.innerHTML = this.templates.widget();

		this.chat = document.querySelector('#fancy-chat .chat');
		this.convos = document.querySelector('#fancy-chat .convos');
	},

	renderHeader: function(data) {
		var self = this;
		var div = document.querySelector('#fancy-chat .header');

		div.innerHTML = this.templates.header(data);

		var btnClose = document.getElementById('fancy-close');
		var btnNewChats = document.getElementById('fancy-newchats');

		var chatsFn = function() { self.onChatsClick(); };
		var newFn = function() {
			self.current = null;
			self.renderChat();
		};

		btnNewChats.addEventListener('click', data.which == 'new' ? newFn : chatsFn);

		btnClose.addEventListener('click', function() {
			self.removeWidget();
		});
	},

	renderChat: function() {
		var self = this;

		this.renderHeader({title: 'new chat', which: 'chats'});

		this.chat.innerHTML = this.templates.chat();
		this.convos.innerHTML = '';

		var btnSend = document.getElementById('fancy-send');
		this.msgBox = document.getElementById('fancy-message');
		this.messages = document.getElementById('fancy-messages');

		btnSend.addEventListener('click', function() {
			self.onSendClick();
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
	}
};
