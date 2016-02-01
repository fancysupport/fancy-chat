function View(store) {
	this.store = store;

	// resets make new stores, fn to update it
	this.set_store = function(store) {
		this.store = store;
	};

	this.init = function() {
		// destroy the old container if there is one
		this.teardown();

		build.call(this);
		this.attach();

		this.show();
	};

	// optionally pass a selector in so users can attach to dom elements
	// used for SPA with re-renders changing dom
	this.attach = function(selector) {
		var s = selector || this.store.activator_selector;

		// no selector means we are probably just using the default activator
		if (!s) return;

		// add the click handler
		add_event('click', dom_select(s), make_handler(this));

		if (this.store.counter_selector) dom_select(this.store.counter_selector).textContent = Math.round(Math.random()*1000);
	};

	// show the chat interface
	this.show = function() {
		this.store.chat_open = true;
		render_chat.call(this);

		// hide the default activator
		if (this.store.default_activator) add_class(this.select('.activator'), 'hide');
	};

	// hide the chat interface
	this.hide = function() {
		this.store.chat_open = false;
		remove_chat.call(this);

		// show the default activator
		if (this.store.default_activator) remove_class(this.select('.activator'), 'hide');
	};
	
	// break it down
	this.teardown = function() {
		var container = dom_id(this.store.container_id);
		if (container) container.remove();
	};

	// build the foundation
	var build = function() {
		var container = dom_elem('div', this.store.container_id);

		// if we are using the default activator create it
		if (this.store.default_activator) {
			var activator = dom_elem('div');
			activator.innerHTML = ViewTemplates.activator();

			// add the handler to it
			add_event('click', activator.firstChild, make_handler(this));

			container.appendChild(activator.firstChild);
		}

		document.body.appendChild(container);
	};

	var make_handler = function(that) {
		return function() {
			if (that.store.chat_open) that.hide();
			else that.show();
		};
	};

	var render_chat = function() {
		var chat = dom_elem('div');
		add_class(chat, 'chat');
		dom_select('#'+this.store.container_id).appendChild(chat);

		// render all the other components
		render_header.call(this);
		render_messages.call(this);
		render_input.call(this);
	};

	var remove_chat = function() {
		var chat = this.select('.chat');
		if (chat) chat.remove();
	};

	var render_header = function() {
		var chat = this.select('.chat');
		if (!chat) return;

		// assemble relevant data from store
		var data = {
			title: this.store.app_name
		};

		// render template
		var header = dom_elem('div');
		header.innerHTML = ViewTemplates.header(data);

		// attach a close handler
		var close = header.firstChild.querySelector('.close');
		add_event('click', close, make_handler(this));

		chat.appendChild(header.firstChild);
	};

	var render_messages = function() {
		var chat = this.select('.chat');
		if (!chat) return;
	};

	var render_input = function() {
		var chat = this.select('.chat');
		if (!chat) return;
		//
		// assemble relevant data from store
		var data = {
			app_name: this.store.app_name
		};

		// render template
		var input = dom_elem('div');
		input.innerHTML = ViewTemplates.input(data);

		// attach handler for copying text to do fancy auto sizing
		var copy = function(input) {
			return function() {
				var text = input.firstChild.querySelector('textarea').value;
				console.log(text);
				var content = text.replace(/\n/g, '<br/>');
				input.firstChild.querySelector('.textcopy').innerHTML = content;
			};
		};
		add_event('change', input.firstChild, copy(input.firstChild));
		add_event('keyup', input.firstChild, copy(input.firstChild));
		add_event('keydown', input.firstChild, copy(input.firstChild));
		// run it now to get size set
		copy();

		chat.appendChild(input.firstChild);
	};

	// convenience selecting of children in the container
	this.select = function(s) {
		return dom_select('#' + this.store.container_id + ' ' + s);
	};
}

function _render_widget() {
	// append the widget to the end of the body, check to make sure
	// it hasn't already been created, if it has, recreate
	var div = dom_id('fancy-chat');
	if ( ! div) {
		div = document.createElement('div');
		div.id = 'fancy-chat';
		document.body.appendChild(div);
	}

	div.innerHTML = ViewTemplates.widget();

	_NODE_CHAT = document.querySelector('#fancy-chat .fancy-chat');
	_NODE_LISTINGS = dom_id('fancy-listings');
}

function _render_header(data) {
	var div = dom_id('fancy-header');

	div.innerHTML = ViewTemplates.header(data);

	var chatsFn = function() { _click_chats(); };
	var newFn = function() { _render_new_chat(); };

	add_event('click', dom_id('fancy-newchats'), data.which == 'fancy-icon-pencil' ? newFn : chatsFn);

	add_event('click', dom_id('fancy-close'), function() {
		_remove_widget();
	});
}

function _render_new_chat(reply) {
	_CURRENT_VIEW = 'new';

	// don't need to render this if we're just going to overwrite it
	if ( ! reply) _render_header({title: 'New Message', which: 'fancy-icon-list'});

	var phrase = reply ? 'Reply to ' : 'Send a message to ';
	_NODE_CHAT.innerHTML = ViewTemplates.chat(phrase + _APP_NAME);
	remove_class(_NODE_CHAT, 'fancy-hide');

	_NODE_LISTINGS.innerHTML = '';
	add_class(_NODE_LISTINGS, 'fancy-hide');

	_NODE_TEXTAREA = dom_id('fancy-textarea');

	add_event('click', dom_id('fancy-send'), function() {
		_click_send();
	});
}

function _render_existing_chat(partial) {
	if (_CURRENT_VIEW !== 'existing') return;

	// skip rendering parts of the ui if they aren't changing
	// stops textarea being cleared after a reply
	if ( ! partial) {
		_render_new_chat(true);
		_render_header({title: _APP_NAME, which: 'fancy-icon-list'});
	}

	// if this thread has unread messages, send a read call
	if (_ACTIVE_THREAD.unread) {
		_update_read(function() {
			_update_active(function() {
				_check_updates();
			});
		});
	}

	var div = dom_id('fancy-messages');

	div.innerHTML = ViewTemplates.messages(_ACTIVE_THREAD);
	div.scrollTop = div.scrollHeight;
}

function _render_listings() {
	if (_CURRENT_VIEW !== 'listing') return;

	_render_header({title: _APP_NAME, which: 'fancy-icon-pencil'});

	var s = _THREADS.sort(function(a, b) {
		if (a.unread !== b.unread) return a.unread ? -1 : 1;
		return a.updated > b.updated ? -1 : 1;
	});

	_NODE_LISTINGS.innerHTML = ViewTemplates.listings(s);
	remove_class(_NODE_LISTINGS, 'fancy-hide');

	_NODE_CHAT.innerHTML = '';
	add_class(_NODE_CHAT, 'fancy-hide');
}

function _render_default_activator() {
	// render the activator if it isn't already there
	var div = dom_id('fancy-activator');
	if ( ! div) {
		div = document.createElement('div');
		div.id = 'fancy-activator';
		document.body.appendChild(div);
		div.innerHTML = ViewTemplates.activator();
	}
}

function _remove_widget() {
	_CURRENT_VIEW = null;
	_NODE_TEXTAREA = null;

	var chat = dom_id('fancy-chat');
	if (chat) document.body.removeChild(chat);
}

function _remove_activator() {
	var selector = _SETTINGS.activator;

	// chat functionality is disabled
	if (selector === false) return;

	// using default activator
	if (selector === true || selector === undefined) {
		selector = '#fancy-activator';

		var activator = dom_id('fancy-activator');
		if (activator) document.body.removeChild(activator);
		return;
	}

	// just remove the click event from their activator
	remove_event('click', document.querySelector(selector), _CLICK_HANDLER);
}

