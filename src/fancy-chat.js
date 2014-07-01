var FancyChat = {
	btnClose: null,
	btnChats: null,
	btnSend: null,
	msgBox: null,
	chat: null,
	convos: null,
	current: null,
	conversations: [],

	// set up local references for things
	cache: function() {
		// dummy data
		for(var i=1; i<5; i++) {
			var data = {
				created: Date.now(),
				updated: Date.now(),
				customer: 123,
				direction: 'in',
				sender: 123,
				content: 'conv ' + i,
				replies: []
			};

			for(var j=0; j<15; j++) {
				var reply = {
					created: Date.now(),
					updated: Date.now(),
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
		// TODO options

		this.renderWidget('fancy');
		this.renderHeader({title: 'new chat', which: 'chats'});
		this.renderChat();

		this.cache();
	},

	onSendClick: function() {
		var message = this.msgBox.value;
		this.msgBox.value = '';

		if(message !== '') {
			console.log(message);

			if(this.current) { // replying to an existing conversation
				var reply = {
					created: Date.now(),
					customer: 'me', // FIXME
					sender: 'me', // FIXME
					direction: 'in',
					content: message
				};

				this.current.updated = Date.now();

				this.current.replies.push(reply);
			} else {  // creating a new conversation
				this.current = {
					created: Date.now(),
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

		this.current = null;

		var self = this;

		var fn = function() {
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

	renderWidget: function(data) {
		var div = document.getElementById(data);

		div.innerHTML = this.templates.widget();

		this.chat = document.querySelector('#fancy-chat .chat');
		this.convos = document.querySelector('#fancy-chat .convos');
	},

	renderHeader: function(data) {
		var self = this;
		var div = document.querySelector('#fancy-chat .header');

		div.innerHTML = this.templates.header(data);

		this.btnClose = document.getElementById('fancy-close');
		this.btnChats = document.getElementById('fancy-chats');

		this.btnChats.addEventListener('click', function() {
			self.onChatsClick();
		});
	},

	renderChat: function() {
		var self = this;

		this.chat.innerHTML = this.templates.chat();
		this.convos.innerHTML = '';

		this.btnSend = document.getElementById('fancy-send');
		this.msgBox = document.getElementById('fancy-message');
		this.messages = document.getElementById('fancy-messages');

		this.btnSend.addEventListener('click', function() {
			self.onSendClick();
		});
	},

	renderConvos: function() {
		var self = this;

		this.convos.innerHTML = this.templates.convos(this.conversations);
		this.chat.innerHTML = '';

		var newBtn = document.getElementById('fancy-new');

		newBtn.addEventListener('click', function() {
			self.current = null;
			self.renderChat();
		});
	},

	renderMessages: function(data) {
		var div = document.getElementById('fancy-messages');

		div.innerHTML = this.templates.messages(data);
		div.scrollTop = div.scrollHeight;
	}
};

window.onload = function() {
	FancyChat.init();
};
