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
}
