// generall all purpose data store
// holds state info too for rendering the view
// app settings
// all the messages and users etc
function Store() {
	this.app_name = '';
	this.app_icon = '';
	this.inited = false;
	this.log_errors = false;

	this.messages = {};
	this.users = {};

	// keeping track of the user input as they type for re-renders
	this.user_input = '';
}
