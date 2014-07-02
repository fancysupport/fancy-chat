/*! atomic v1.0.0 | (c) 2014 @toddmotto | github.com/toddmotto/atomic */
!function(a,b){"function"==typeof define&&define.amd?define(b):"object"==typeof exports?module.exports=b:a.atomic=b(a)}(this,function(a){"use strict";var b={},c=function(a){var b;try{b=JSON.parse(a.responseText)}catch(c){b=a.responseText}return[b,a]},d=function(b,d,e){var f={success:function(){},error:function(){}},g=a.XMLHttpRequest||ActiveXObject,h=new g("MSXML2.XMLHTTP.3.0");return h.open(b,d,!0),h.setRequestHeader("Content-type","application/x-www-form-urlencoded"),h.onreadystatechange=function(){4===h.readyState&&(200===h.status?f.success.apply(f,c(h)):f.error.apply(f,c(h)))},h.send(e),{success:function(a){return f.success=a,f},error:function(a){return f.error=a,f}}};return b.get=function(a){return d("GET",a)},b.put=function(a,b){return d("PUT",a,b)},b.post=function(a,b){return d("POST",a,b)},b["delete"]=function(a){return d("DELETE",a)},b});

var FancyChat = {
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
		this.renderChat();

		this.cache();
	},

	onSendClick: function() {
		var message = this.msgBox.value;
		this.msgBox.value = '';

		if(message !== '') {
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

		var btnClose = document.getElementById('fancy-close');
		var btnNewChats = document.getElementById('fancy-newchats');

		var chatsFn = function() { self.onChatsClick(); };
		var newFn = function() {
			self.current = null;
			self.renderChat();
		};

		btnNewChats.addEventListener('click', data.which == 'new' ? newFn : chatsFn);
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
	}
};

window.onload = function() {
	FancyChat.init();
};
