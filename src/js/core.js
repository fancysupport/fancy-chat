var view;

var catch_error = function(e) {
	try {
		var desc = e.message;
		if (e.filename) desc += ' -- ' + e.filename;
		if (e.lineno) desc += ':' + e.lineno;

		var event = {
			name: 'error',
			details: desc 
		};

		view.api.event(event, function() {});
	} catch(ex) {}
};

// make available to client
FancySupport.init = function init(options) {
	// don't run on ie < 9
	if (detectIE() && detectIE() < 9) {
		console.warn('FancySupport: does not work in IE < 9.');
		return;
	}
	
	if (typeof options !== 'object') {
		console.error('FancySupport: requires a config object.');
		return;
	}

	if (!options.signature) {
		console.error('FancySupport: missing required signature in options.');
		return;
	}

	if (!options.app_key) {
		console.error('FancySupport: missing required app_key in options.');
		return;
	}

	if (!options.customer_id) {
		console.error('FancySupport: missing required customer_id in options.');
		return;
	}

	if (options.custom_data && typeof options.custom_data !== 'object') {
		console.error('FancySupport: custom_data needs to be an object.');
		return;
	}
	
	// init the store
	var store = new Store();
	store.default_activator = !options.hide_default_activator;
	store.activator_selector = options.activator || null;
	store.counter_selector = options.counter || null;

	// set customer details
	store.customer = {
		customer_id: options.customer_id,
		name: options.name,
		email: options.email,
		email_md5: md5(options.email),
		phone: options.phone
	};

	if (options.custom_data) store.customer.custom_data = options.custom_data;

	// init api
	var api = new FancyAPI(
		'http://local.fancysupport.com:4000/client',
		'4nBDCN8yMwP5TkLPOKrdC50mBiEIVbKz',
		'90871c583fd68c318fcad7df0319ab53656eb42c',
		'545871964c129f718d000002'
	);

	// init render engine, remove if we have one already
	if (view) view.teardown();
	view = new View(store, api);
	view.init();

	// catch errors?
	window.removeEventListener('error', catch_error);
	if (options.log_errors) {
		store.log_errors = true;
		window.addEventListener('error', catch_error);
	}

	// make these available to the client
	FancySupport.impression = function impression() {
		api.impression(store.impression_data(), function(res, err) {
			if (err) console.warn('FancySupport: client received an error trying to send an impression.');
		});
	};

	FancySupport.event = function event(opts) {
		if (!opts || !opts.name) return console.error('FancySupport.event(data) requires a data object with an event name.');

		var e = {
			name: opts.name
		};

		if (opts.details) e.details = opts.details;

		api.event(e, function(res, err) {
			if (err) console.warn('FancySupport: client received an error trying to send an event.');
		});
	};

	FancySupport.attach = function attach(selector) {
		view.attach(selector);
	};

};

