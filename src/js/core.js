var view;
var last_impression = Date.now();
var last_poll = Date.now();
var poll_ref;

// catching global errors
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

// detecting when tab/window is focused again so we can impression
var has_focus = function(e) {
	try {
		var elapsed = Date.now() - last_impression;
		if (!document.hidden && elapsed > 5*60*1000) {
			view.api.impression(view.store.impression_data(), function() {});
			last_impression = Date.now();
		}
	} catch(ex) {}
};

var start_polling = function() {
	clearInterval(poll_ref);
	setInterval(function() {
		view.fetch_messages();
	}, 5*60*1000);
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
	store.introduction = options.introduction;

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
		options.api_url || 'https://api.fancysupport.com/client',
		options.app_key,
		options.signature,
		options.customer_id
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

	// detect tab focus
	document.removeEventListener('visibilitychange', has_focus);
	document.addEventListener('visibilitychange', has_focus);

	// start message polling
	start_polling();

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

