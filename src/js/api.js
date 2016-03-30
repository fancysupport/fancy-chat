function FancyAPI(url, key, sig, customer_id) {
	this.url = url;
	this.key = key;
	this.sig = sig;
	this.customer_id = customer_id;

	// general http fn
	this.request = function(opts, cb) {
		var r = new XMLHttpRequest();
		var url = this.url+opts.path;
		if (opts.qs) {
			url += '?' + make_query_string(opts.qs);
		}

		r.open(opts.method, url, true);

		if (opts.json) {
			r.setRequestHeader('Content-type', 'application/json');
			opts.data = JSON.stringify(opts.data);
		} else {
			r.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		}

		r.setRequestHeader('Cache-Control', 'no-cache');
		r.setRequestHeader('Pragma', 'no-cache');
		if (detectIE()) r.setRequestHeader('If-Modified-Since', 'Sat, 01 Jan 2000 00:00:00 GMT');
		r.setRequestHeader('X-App-Key', this.key);
		r.setRequestHeader('X-Signature', this.sig);
		r.setRequestHeader('X-Customer-Id', this.customer_id);

		r.onreadystatechange = function () {
			if (r.readyState === 4 && cb) {
				var response = {code: r.status};
				try {
					response.data = JSON.parse(r.responseText);
				} catch (e) {
					response.data = r.responseText;
				}

				if (r.status >= 200 && r.status < 300) {
					cb(response);
				} else {
					cb(null, response.error || response);
				}
			}
		};

		r.send(opts.data);
	};

	// get the payload
	// includes settings for showing names and app details
	// last X messages
	// also records an impression for convenience
	this.payload = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/payload',
			data: data,
			json: true
		}, cb);
	};

	// get messages 
	this.get_messages = function(qs, cb) {
		this.request({
			method: 'GET',
			qs: qs,
			path: '/messages'
		}, cb);
	};
	
	// acknowledge messages 
	this.read_messages = function(cb) {
		this.request({
			method: 'POST',
			path: '/read'
		}, cb);
	};
	
	// send a message
	this.message = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/message',
			data: data,
			json: true
		}, cb);
	};

	// record an impression
	this.impression = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/impression',
			data: data,
			json: true
		}, cb);
	};

	// record an event
	this.event = function(data, cb) {
		this.request({
			method: 'POST',
			path: '/event',
			data: data,
			json: true
		}, cb);
	};
}

