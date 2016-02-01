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

	this.app_name = '';
	this.app_icon = '';
	this.inited = false;
	this.log_errors = false;

	this.customer = {};
	this.messages = {};
	this.users = {};

	// keeping track of the user input as they type for re-renders
	this.user_input = '';
}
