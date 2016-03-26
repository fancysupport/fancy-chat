function View(store, api) {
	this.store = store;
	this.api = api;

	this.init = function() {
		// destroy the old container if there is one
		this.teardown();

		build.call(this);
		this.attach();

		// fetch the payload
		var that = this;
		this.api.payload(this.store.impression_data(), function(res, err) {
			console.log('payload', res, err);
			if (check_api_error(err)) return;

			if (Array.isArray(res.data.messages)) {
				that.store.messages = res.data.messages;
				console.log('set messages from payload');
			}
			if (typeof res.data.settings === 'object') {
				that.store.settings = res.data.settings;
			}
			that.rerender();
		});

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
	};

	// show the chat interface
	this.show = function() {
		this.store.chat_open = true;
		remove_chat.call(this);
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

		// can't forget to remove the resize listener
		window.removeEventListener('resize', this.resize_handler);
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

		// add the window resize handler
		window.addEventListener('resize', this.resize_handler);
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

		// set chat size on initial render
		this.set_chat_size();
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
			title: this.store.settings.app_name
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
		// update counts
		var count = this.store.unread_count();
		if (this.store.counter_selector) {
			dom_select(this.store.counter_selector).textContent = count || '';
			if (count) add_class(dom_select(this.store.counter_selector), 'unread');
			else remove_class(dom_select(this.store.counter_selector), 'unread');
		}
		if (this.store.default_activator) this.select('.activator .counter').textContent = count || '';

		// nothing else to do if not showing
		var chat = this.select('.chat');
		if (!chat) return;

		// format the data
		var data = {
			messages: this.store.messages_formatted(),
			customer_avatar: this.store.customer_avatar(),
			fancy_avatar: this.store.fancy_avatar(),
			introduction: this.store.introduction
		};

		var messages = dom_elem('div');
		messages.innerHTML = ViewTemplates.messages(data);

		// replace content if it exists
		var existing = this.select('.chat .messages');
		if (existing) {
			existing.innerHTML = messages.firstChild.innerHTML;
			this.set_chat_size();
		}
		else {
			chat.appendChild(messages.firstChild);
		}
	};

	var render_input = function() {
		var chat = this.select('.chat');
		if (!chat) return;
		
		// assemble relevant data from store
		var data = {
			app_name: this.store.settings.app_name
		};

		// render template
		var input = dom_elem('div');
		input.innerHTML = ViewTemplates.input(data);

		// attach handler for copying text to do fancy auto sizing
		var copy = function(input, e) {
			var text = input.querySelector('textarea').value;

			// we need to intercept the enter key to send the message ~
			// reset the inputs too
			if (e && e.which === 13 && !e.shiftKey && e.type === "keydown") {
				e.preventDefault();
				var msg = {
					id: random_id(10),
					created: unix(),
					content: text.replace(/\n+$/,'')
				};

				// api send
				var that = this;
				this.api.message(msg, function(res, err) {
					if (check_api_error(err)) return;

					that.store.messages_remove(msg.id);
					that.store.messages_add(res.data);
					that.messages_changed();
				});

				// optimism
				msg.incoming = true;
				msg.customer_id = this.store.customer.customer_id;
				this.store.messages_add(msg);
				this.messages_changed();

				input.querySelector('textarea').value = '';
				input.querySelector('.textcopy').innerHTML = '';

				return;
			}
			if (e && e.which === 13 && !e.shiftKey && e.type === "keyup") {
				e.preventDefault();
				return;
			}

			var content = text.replace(/\n/g, '<br/>');
			input.querySelector('.textcopy').innerHTML = content;
			// need to make sure the size of messages list stays true
			this.set_chat_size();
		};
		add_event('change', input.firstChild, copy.bind(this, input.firstChild));
		add_event('keyup', input.firstChild, copy.bind(this, input.firstChild));
		add_event('keydown', input.firstChild, copy.bind(this, input.firstChild));
		// run it now to get the size set
		copy.call(this, input.firstChild);

		chat.appendChild(input.firstChild);
	};

	// for re-rendering when data changes
	this.rerender = function() {
		if (this.store.chat_open) {
			remove_chat.call(this);
			render_chat.call(this);
		}
	};

	// for re-rendering when store has new messages
	this.messages_changed = function() {
		// out with the old in with the new
		render_messages.call(this);
	};

	// requires header, messages and input to be rendered
	// dynamic sizing of messages list, better than css
	this.set_chat_size = function() {
		var chat = this.select('.chat');
		var header = this.select('.chat .header');
		var messages = this.select('.chat .messages');
		var input = this.select('.chat .input');

		if (!chat || !header || !messages || !input) return;

		// getting the viewport size requires a hack since window.innerHeight isn't reliable on mobile
		// also browsers decide to include window chroming sometimes and blah blah
		var test = document.createElement('div');
		test.style.cssText = 'position: fixed; top: 0; left: 0; bottom: 0; right: 0;';
		document.documentElement.insertBefore(test, document.documentElement.firstChild);
		var viewport = {width: test.offsetWidth, height: test.offsetHeight};
		document.documentElement.removeChild(test);

		var header_height = header.offsetHeight;
		var input_height = input.offsetHeight;

		chat.style.height = viewport.height+'px';
		messages.style.height = (viewport.height - header_height - input_height)+'px';

		// scroll the messages
		messages.scrollTop = messages.scrollHeight;
	};

	// for attaching/removing from resize event
	this.resize_handler = this.set_chat_size.bind(this);

	// convenience selecting of children in the container
	this.select = function(s) {
		return dom_select('#' + this.store.container_id + ' ' + s);
	};

	var check_api_error = function(err) {
		if (err) {
			if (err.code === 401) {
				console.warn('FancySupport: client received a 401 error. Check your signature and app key are correct.');
			}
			else {
				console.warn('FancySupport: client received a ' + err.code + ' error.');
			}

			return true;
		}

		return false;
	};

	// called from a poll or show
	this.fetch_messages = function() {
		var that = this;
		this.api.get_messages(function(res, err) {
			if (!err && Array.isArray(res.data)) {
				for (var x = 0; x < res.data.length; x++) {
					that.store.messages_add(res.data[x]);
				}
				that.messages_changed();
			}
		});
	};
}
