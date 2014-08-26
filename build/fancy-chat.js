(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory;
  } else {
    root.atomic = factory(root);
  }
})(this, function (root) {

  'use strict';

  var exports = {};

  var parse = function (req) {
    var result;
    try {
      result = JSON.parse(req.responseText);
    } catch (e) {
      result = req.responseText;
    }
    return [result, req];
  };

  var xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    };
    var XHR = root.XMLHttpRequest || XDomainRequest;
    var request = new XHR('MSXML2.XMLHTTP.3.0');
    request.withCredentials = true;
    request.open(type, url, true);
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

  exports['get'] = function (src) {
    return xhr('GET', src);
  };

  exports['put'] = function (url, data) {
    return xhr('PUT', url, data);
  };

  exports['post'] = function (url, data) {
    return xhr('POST', url, data);
  };

  exports['delete'] = function (url) {
    return xhr('DELETE', url);
  };

  return exports;

});

var FancyChat = {
	msgBox: null,
	chat: null,
	convos: null,
	current: null,
	conversations: [],
	url: 'http://api.fancysupport.com:4000/',

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

	init: function(options) {
		var self = this;
		// TODO options

		if ( ! options.signature)
			throw "Fancy needs a customer signature.";

		if ( ! options.app_key)
			throw "Fancy needs a application key.";

		var impression = {
			signature: options.signature,
			app_key: options.app_key
		};

		atomic.post(this.url + 'impression', impression)
			.success(function(data, xhr) {
				console.log('success', data, xhr);
			})
			.error(function(data, xhr) {
				console.log('error', data, xhr);
			});

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

		//this.cache();
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
}(document, "#fancy-chat {\n" +
"  position: fixed;\n" +
"  left: 50%;\n" +
"  top: 50%;\n" +
"  width: 650px;\n" +
"  margin-left: -325px;\n" +
"  height: 450px;\n" +
"  margin-top: -225px;\n" +
"  z-index: 1234;\n" +
"  box-shadow: 0 0 0 1px #000;\n" +
"}\n" +
"#fancy-chat * {\n" +
"  -webkit-box-sizing: border-box;\n" +
"  -moz-box-sizing: border-box;\n" +
"  box-sizing: border-box;\n" +
"  margin: 0;\n" +
"  padding: 0;\n" +
"}\n" +
"#fancy-chat.hide {\n" +
"  display: none;\n" +
"}\n" +
"#fancy-chat.block {\n" +
"  display: block;\n" +
"}\n" +
"#fancy-chat .header {\n" +
"  height: 80px;\n" +
"  box-shadow: 0 0 0 1px #000;\n" +
"  background-color: #eaeaea;\n" +
"}\n" +
"#fancy-chat .header span {\n" +
"  position: absolute;\n" +
"  width: 550px;\n" +
"  top: 25px;\n" +
"  left: 50px;\n" +
"  font-size: 18pt;\n" +
"  text-align: center;\n" +
"}\n" +
"#fancy-chat .header a {\n" +
"  position: absolute;\n" +
"  right: 32px;\n" +
"  top: 31px;\n" +
"  width: 25px;\n" +
"  height: 25px;\n" +
"  cursor: pointer;\n" +
"  text-align: center;\n" +
"}\n" +
"#fancy-chat .header a#fancy-close {\n" +
"  right: 5px;\n" +
"}\n" +
"#fancy-chat #fancy-messages {\n" +
"  margin-top: 1px;\n" +
"  height: 250px;\n" +
"  box-shadow: 0 0 0 1px #000;\n" +
"  overflow-y: auto;\n" +
"}\n" +
"#fancy-chat #fancy-messages .message {\n" +
"  overflow: hidden;\n" +
"  margin: 0;\n" +
"}\n" +
"#fancy-chat #fancy-messages .in {\n" +
"  background-color: #ebebeb;\n" +
"}\n" +
"#fancy-chat #fancy-messages .in .message {\n" +
"  padding-left: 10px;\n" +
"}\n" +
"#fancy-chat #fancy-messages .out .message {\n" +
"  text-align: right;\n" +
"  padding-right: 10px;\n" +
"}\n" +
"#fancy-chat .send {\n" +
"  position: relative;\n" +
"  height: 120px;\n" +
"}\n" +
"#fancy-chat .send #fancy-send {\n" +
"  position: absolute;\n" +
"  right: 8px;\n" +
"  top: 8px;\n" +
"  width: 13%;\n" +
"  height: 104px;\n" +
"  line-height: 104px;\n" +
"  cursor: pointer;\n" +
"  display: inline-block;\n" +
"  text-align: center;\n" +
"  outline: none;\n" +
"  border: none;\n" +
"  background-color: #d6d6d6;\n" +
"  color: #808080;\n" +
"  -webkit-border-radius: 0.25em;\n" +
"  -moz-border-radius: 0.25em;\n" +
"  border-radius: 0.25em;\n" +
"  -webkit-user-select: none;\n" +
"  -moz-user-select: none;\n" +
"  user-select: none;\n" +
"}\n" +
"#fancy-chat .send .message {\n" +
"  width: 550px;\n" +
"  margin: 0;\n" +
"  padding-top: 8px;\n" +
"  padding-left: 8px;\n" +
"}\n" +
"#fancy-chat .send .message textarea {\n" +
"  width: 100%;\n" +
"  height: 104px;\n" +
"  resize: none;\n" +
"  padding: 0.6em 1em;\n" +
"  line-height: 1.33;\n" +
"  vertical-align: top;\n" +
"  outline: none;\n" +
"  -webkit-border-radius: 0.3125em;\n" +
"  -moz-border-radius: 0.3125em;\n" +
"  border-radius: 0.3125em;\n" +
"}\n" +
"\n" +
"@media only screen and (max-width: 1030px) and (orientation: landscape) {\n" +
"  #fancy-chat {\n" +
"    width: 650px;\n" +
"    margin-left: -325px;\n" +
"    height: 385px;\n" +
"    margin-top: -192.5px;\n" +
"  }\n" +
"  #fancy-chat .header {\n" +
"    height: 60px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    top: 14px;\n" +
"  }\n" +
"  #fancy-chat .header a {\n" +
"    top: 21px;\n" +
"  }\n" +
"  #fancy-chat #fancy-messages {\n" +
"    height: 210px;\n" +
"  }\n" +
"  #fancy-chat .send #fancy-send {\n" +
"    height: 100px;\n" +
"  }\n" +
"  #fancy-chat .send .message textarea {\n" +
"    height: 100px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 600px) and (orientation: portrait) {\n" +
"  #fancy-chat {\n" +
"    width: 590px;\n" +
"    margin-left: -295px;\n" +
"    height: 450px;\n" +
"    margin-top: -225px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 384px;\n" +
"    left: 103px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 496px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 600px) and (orientation: landscape) {\n" +
"  #fancy-chat {\n" +
"    width: 590px;\n" +
"    margin-left: -295px;\n" +
"    height: 350px;\n" +
"    margin-top: -175px;\n" +
"  }\n" +
"  #fancy-chat .header {\n" +
"    height: 60px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 384px;\n" +
"    left: 103px;\n" +
"    top: 14px;\n" +
"  }\n" +
"  #fancy-chat .header a {\n" +
"    top: 21px;\n" +
"  }\n" +
"  #fancy-chat #fancy-messages {\n" +
"    height: 170px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 496px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 568px) and (orientation: landscape) {\n" +
"  #fancy-chat {\n" +
"    width: 560px;\n" +
"    margin-left: -280px;\n" +
"    height: 250px;\n" +
"    margin-top: -125px;\n" +
"  }\n" +
"  #fancy-chat .header {\n" +
"    height: 60px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 366px;\n" +
"    left: 97px;\n" +
"    top: 14px;\n" +
"  }\n" +
"  #fancy-chat .header a {\n" +
"    top: 21px;\n" +
"  }\n" +
"  #fancy-chat #fancy-messages {\n" +
"    height: 100px;\n" +
"  }\n" +
"  #fancy-chat .send {\n" +
"    height: 85px;\n" +
"  }\n" +
"  #fancy-chat .send #fancy-send {\n" +
"    right: 5px;\n" +
"    top: 5px;\n" +
"    width: 75px;\n" +
"    height: 80px;\n" +
"    line-height: 80px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 474px;\n" +
"    padding-left: 5px;\n" +
"    padding-top: 5px;\n" +
"  }\n" +
"  #fancy-chat .send .message textarea {\n" +
"    height: 80px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 480px) and (orientation: landscape) {\n" +
"  #fancy-chat {\n" +
"    width: 460px;\n" +
"    margin-left: -230px;\n" +
"    height: 250px;\n" +
"    margin-top: -125px;\n" +
"  }\n" +
"  #fancy-chat .header {\n" +
"    height: 60px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 300px;\n" +
"    left: 80px;\n" +
"    top: 14px;\n" +
"  }\n" +
"  #fancy-chat .header a {\n" +
"    top: 21px;\n" +
"  }\n" +
"  #fancy-chat #fancy-messages {\n" +
"    height: 100px;\n" +
"  }\n" +
"  #fancy-chat .send {\n" +
"    height: 85px;\n" +
"  }\n" +
"  #fancy-chat .send #fancy-send {\n" +
"    right: 5px;\n" +
"    top: 5px;\n" +
"    width: 75px;\n" +
"    height: 80px;\n" +
"    line-height: 80px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 375px;\n" +
"    padding-left: 5px;\n" +
"    padding-top: 5px;\n" +
"  }\n" +
"  #fancy-chat .send .message textarea {\n" +
"    height: 80px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 384px) and (min-width: 321px) {\n" +
"  #fancy-chat {\n" +
"    width: 375px;\n" +
"    margin-left: -187.5px;\n" +
"    height: 590px;\n" +
"    margin-top: -295px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 250px;\n" +
"    left: 67px;\n" +
"  }\n" +
"  #fancy-chat #fancy-messages {\n" +
"    height: 395px;\n" +
"  }\n" +
"  #fancy-chat .send #fancy-send {\n" +
"    right: 5px;\n" +
"    top: 5px;\n" +
"    width: 65px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 300px;\n" +
"    padding-left: 5px;\n" +
"    padding-top: 5px;\n" +
"  }\n" +
"}\n" +
"@media only screen and (max-width: 320px) {\n" +
"  #fancy-chat {\n" +
"    width: 310px;\n" +
"    margin-left: -155px;\n" +
"    height: 400px;\n" +
"    margin-top: -200px;\n" +
"  }\n" +
"  #fancy-chat .header {\n" +
"    height: 60px;\n" +
"  }\n" +
"  #fancy-chat .header span {\n" +
"    width: 200px;\n" +
"    left: 55px;\n" +
"    top: 14px;\n" +
"  }\n" +
"  #fancy-chat .header a {\n" +
"    top: 21px;\n" +
"  }\n" +
"  #fancy-chat .send {\n" +
"    height: 85px;\n" +
"  }\n" +
"  #fancy-chat .send #fancy-send {\n" +
"    right: 5px;\n" +
"    top: 5px;\n" +
"    width: 50px;\n" +
"    height: 80px;\n" +
"    line-height: 80px;\n" +
"  }\n" +
"  #fancy-chat .send .message {\n" +
"    width: 250px;\n" +
"    padding-left: 5px;\n" +
"    padding-top: 5px;\n" +
"  }\n" +
"  #fancy-chat .send .message textarea {\n" +
"    height: 80px;\n" +
"  }\n" +
"}"));

FancyChat.templates = {};
FancyChat["templates"]["chat"] = function anonymous(it) {
var out='<div id="fancy-messages"></div><div class="send"><div class="message"><textarea id="fancy-message" placeholder="batman"></textarea></div><div id="fancy-send">Send</div></div>';return out;
};
FancyChat["templates"]["convos"] = function anonymous(it) {
var out='<div id="fancy-convos">';var arr1=it;if(arr1){var v,k=-1,l1=arr1.length-1;while(k<l1){v=arr1[k+=1];out+='<div class="convo" data-id="'+( k )+'">'+( v.content ||'').toString().encodeHTML()+'</div>';} } out+='</div>';return out;
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