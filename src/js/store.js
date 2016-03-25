// generall all purpose data store
// holds state info too for rendering the view
// app settings
// all the messages and users etc
function Store() {
	this.container_id = 'fancysupport';
	this.default_activator = true;
	this.activator_selector = null;
	this.counter_selector = null;
	this.chat_open = false;
	this.inited = false;
	this.log_errors = false;

	this.settings = {
		app_name: '',
		app_icon: ''
	};

	this.customer = {};
	this.messages = [];

	// keeping track of the user input as they type for re-renders
	this.user_input = '';

	this.impression_data = function() {
		var d = {
			name: this.customer.name
		};

		if (this.customer.email) d.email = this.customer.email;
		if (this.customer.phone) d.phone = this.customer.phone;
		if (this.customer.custom_data) d.custom_data = this.customer.custom_data;

		return d;
	};

	this.customer_avatar = function() {
		return 'https://secure.gravatar.com/avatar/'+this.customer.email_md5+'?d=mm';
	};

	this.fancy_avatar = function() {
		return 'https://cdn.fancy.support/'+this.settings.app_icon;
	};

	this.messages_remove = function(id) {
		console.log('removing message', id);
		for (var x = 0; x < this.messages.length; x++) {
			if (this.messages[x].id === id) this.messages.splice(x, 1);
		}
	};

	this.messages_add = function(msg) {
		console.log('adding message', msg);
		if (typeof msg !== 'object') return;

		// replace if it exists
		for (var x = 0; x < this.messages.length; x++) {
			if (this.messages[x].id === msg.id) {
				this.messages[x] = msg;
				return;
			}
		}

		this.messages.push(msg);
	};

	this.messages_formatted = function() {
		// copies messages and adds names and returns it sorted by date
		var x;
		var msgs = [];

		for (x = 0; x < this.messages.length; x++) {
			msgs.push(JSON.parse(JSON.stringify(this.messages[x])));
		}

		for (x = 0; x < msgs.length; x++) {
			if (!msgs[x].incoming) msgs[x].user_name = this.settings[msgs[x].user_id] || this.settings.app_name;
		}

		msgs.sort(function(a, b) {
			return a.created > b.created ? 1 : -1;
		});

		return msgs;
	};

}

