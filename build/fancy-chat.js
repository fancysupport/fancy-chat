/*! atomic v1.0.0 | (c) 2014 @toddmotto | github.com/toddmotto/atomic */
!function(a,b){"function"==typeof define&&define.amd?define(b):"object"==typeof exports?module.exports=b:a.atomic=b(a)}(this,function(a){"use strict";var b={},c=function(a){var b;try{b=JSON.parse(a.responseText)}catch(c){b=a.responseText}return[b,a]},d=function(b,d,e){var f={success:function(){},error:function(){}},g=a.XMLHttpRequest||ActiveXObject,h=new g("MSXML2.XMLHTTP.3.0");return h.open(b,d,!0),h.setRequestHeader("Content-type","application/x-www-form-urlencoded"),h.onreadystatechange=function(){4===h.readyState&&(200===h.status?f.success.apply(f,c(h)):f.error.apply(f,c(h)))},h.send(e),{success:function(a){return f.success=a,f},error:function(a){return f.error=a,f}}};return b.get=function(a){return d("GET",a)},b.put=function(a,b){return d("PUT",a,b)},b.post=function(a,b){return d("POST",a,b)},b["delete"]=function(a){return d("DELETE",a)},b});

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

(function (doc, cssText) {
    var styleEl = doc.createElement("style");
    doc.getElementsByTagName("head")[0].appendChild(styleEl);
    if (styleEl.styleSheet) {
        if (!styleEl.styleSheet.disabled) {
            styleEl.styleSheet.cssText = cssText;
        }
    } else {
        try {
            styleEl.innerHTML = cssText;
        } catch (ignore) {
            styleEl.innerText = cssText;
        }
    }
}(document, "#fancy-chat{position:fixed;left:50%;top:50%;width:650px;margin-left:-325px;height:450px;margin-top:-225px;z-index:1234;box-shadow:0 0 0 1px #000;}#fancy-chat *{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;margin:0;padding:0}#fancy-chat.hide{display:none}#fancy-chat.block{display:block}#fancy-chat .header{height:80px;box-shadow:0 0 0 1px #000;}#fancy-chat .header span{position:absolute;top:25px;left:50px;font-size:18pt;width:550px;text-align:center}#fancy-chat .header a{position:absolute;right:32px;top:31px;width:25px;height:25px;cursor:pointer;text-align:center;}#fancy-chat .header a#fancy-close{right:5px}#fancy-chat #fancy-messages{margin-top:1px;height:250px;box-shadow:0 0 0 1px #000;overflow-y:auto;}#fancy-chat #fancy-messages .message{overflow:hidden;margin:0}#fancy-chat #fancy-messages .in{background-color:#ebebeb;}#fancy-chat #fancy-messages .in .message{padding-left:10px}#fancy-chat #fancy-messages .out .message{text-align:right;padding-right:10px}#fancy-chat .send{position:relative;height:120px;}#fancy-chat .send #fancy-send{position:absolute;right:8px;top:8px;width:13%;height:104px;line-height:104px;cursor:pointer;display:inline-block;text-align:center;outline:none;border:none;background-color:#d6d6d6;color:#808080;-webkit-border-radius:.25em;-moz-border-radius:.25em;border-radius:.25em;-webkit-user-select:none;-moz-user-select:none;user-select:none}#fancy-chat .send .message{width:550px;margin:0;padding-top:8px;padding-left:8px;}#fancy-chat .send .message textarea{width:100%;height:104px;resize:none;padding:.6em 1em;line-height:1.33;vertical-align:top;outline:none;-webkit-border-radius:.3125em;-moz-border-radius:.3125em;border-radius:.3125em}"));

FancyChat.templates = {};
FancyChat["templates"]["chat"] = function anonymous(it) {
var out='<div id="fancy-messages"></div><div class="send"><div class="message"><textarea id="fancy-message" placeholder="batman"></textarea></div><div id="fancy-send">Send</div></div>';return out;
};
FancyChat["templates"]["convos"] = function anonymous(it) {
var out='<div id="fancy-convos">';var arr1=it;if(arr1){var v,k=-1,l1=arr1.length-1;while(k<l1){v=arr1[k+=1];out+='<div class="convo" data-id="'+( k )+'">'+( v.content )+'</div>';} } out+='</div>';return out;
};
FancyChat["templates"]["header"] = function anonymous(it) {
var out='<span>'+( it.title )+'</span><a id="fancy-newchats">'+( it.which )+'</a><a id="fancy-close">X</a>';return out;
};
FancyChat["templates"]["messages"] = function anonymous(it) {
var out=''; var prev = it.direction; out+='<div class="'+( it.direction )+'"><p class="message">'+( it.content ||'').toString().encodeHTML()+'</p>';var arr1=it.replies;if(arr1){var m,i1=-1,l1=arr1.length-1;while(i1<l1){m=arr1[i1+=1];if(m.direction === prev){out+='<p class="message">'+( m.content ||'').toString().encodeHTML()+'</p>';}else{out+='</div><div class="'+( m.direction )+'"><p class="message">'+( m.content ||'').toString().encodeHTML()+'</p>';} prev = m.direction; } } out+='</div>';return out;
};
FancyChat["templates"]["widget"] = function anonymous(it) {
var out='<div class="header"></div><div class="body"><div class="chat"></div><div class="convos"></div></div>';return out;
};