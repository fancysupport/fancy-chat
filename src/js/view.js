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
