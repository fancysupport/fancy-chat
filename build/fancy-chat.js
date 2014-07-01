/*! atomic v1.0.0 | (c) 2014 @toddmotto | github.com/toddmotto/atomic */
!function(a,b){"function"==typeof define&&define.amd?define(b):"object"==typeof exports?module.exports=b:a.atomic=b(a)}(this,function(a){"use strict";var b={},c=function(a){var b;try{b=JSON.parse(a.responseText)}catch(c){b=a.responseText}return[b,a]},d=function(b,d,e){var f={success:function(){},error:function(){}},g=a.XMLHttpRequest||ActiveXObject,h=new g("MSXML2.XMLHTTP.3.0");return h.open(b,d,!0),h.setRequestHeader("Content-type","application/x-www-form-urlencoded"),h.onreadystatechange=function(){4===h.readyState&&(200===h.status?f.success.apply(f,c(h)):f.error.apply(f,c(h)))},h.send(e),{success:function(a){return f.success=a,f},error:function(a){return f.error=a,f}}};return b.get=function(a){return d("GET",a)},b.put=function(a,b){return d("PUT",a,b)},b.post=function(a,b){return d("POST",a,b)},b["delete"]=function(a){return d("DELETE",a)},b});

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

FancyChat.templates = {};
FancyChat["templates"]["chat"] = function anonymous(it) {
var out='<div id="fancy-messages"></div><div class="send"><div class="message"><textarea id="fancy-message" placeholder="batman"></textarea></div><button id="fancy-send">Send</button></div>';return out;
};
FancyChat["templates"]["convos"] = function anonymous(it) {
var out='<div id="fancy-convos">';var arr1=it;if(arr1){var v,k=-1,l1=arr1.length-1;while(k<l1){v=arr1[k+=1];out+='<div class="convo" data-id="'+( k )+'">'+( v.content )+'</div>';} } out+='<button id="fancy-new">New</button></div>';return out;
};
FancyChat["templates"]["header"] = function anonymous(it) {
var out='<span>'+( it.title )+'</span><a id="fancy-'+( it.which )+'">'+( it.which )+'</a><a id="fancy-close">X</a>';return out;
};
FancyChat["templates"]["messages"] = function anonymous(it) {
var out=''; var prev = it.direction; out+='<div class="'+( it.direction )+'"><p class="message">'+( it.content )+'</p>';var arr1=it.replies;if(arr1){var m,i1=-1,l1=arr1.length-1;while(i1<l1){m=arr1[i1+=1];if(m.direction === prev){out+='<p class="message">'+( m.content )+'</p>';}else{out+='</div><div class="'+( m.direction )+'"><p class="message">'+( m.content )+'</p>';} prev = m.direction; } } out+='</div>';return out;
};
FancyChat["templates"]["widget"] = function anonymous(it) {
var out='<div id="fancy-chat"><div class="header"></div><div class="body"><div class="chat"></div><div class="convos"></div></div></div>';return out;
};