function View(store) {
	this.store = store;

	// resets make new stores, fn to update it
	this.set_store = function(store) {
		this.store = store;
	};

	// main render, do everything
	this.render = function() {
		
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

