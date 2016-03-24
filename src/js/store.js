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

	this.app_name = 'test app name';
	this.app_icon = '';
	this.inited = false;
	this.log_errors = false;

	this.customer = {};
	this.messages = [{
    "id": "56978502fb1d88590066beab",
    "app_id": "53e591cf4c129f663a000001",
    "created": 1452770562,
    "customer_id": "545871964c129f718d000002",
    "user_id": "",
    "incoming": true,
    "content": "weow a new message"
		}, {
    "id": "5697770bfb1d88590066be9e",
    "app_id": "53e591cf4c129f663a000001",
    "created": 1452766987,
    "customer_id": "545871964c129f718d000002",
    "user_id": "",
    "incoming": true,
    "content": "hi\n\nnew line and shit\n\n\n\n"
		}, {
    "id": "553fe8794c129f32aa00000b",
    "app_id": "53e591cf4c129f663a000001",
    "created": 1430251641,
    "customer_id": "545871964c129f718d000002",
    "user_id": "545871964c129f718d000002",
    "incoming": false,
    "content": "a"
	}];
	this.users = {};

	// keeping track of the user input as they type for re-renders
	this.user_input = '';
}
