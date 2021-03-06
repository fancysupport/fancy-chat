function timeago(time) {
	var
			local  = Math.floor(new Date().getTime()/1000),
			offset = Math.abs((local - time)),
			span   = [],
			MINUTE = 60,
			HOUR   = 3600,
			DAY    = 86400,
			WEEK   = 604800,
			YEAR   = 31556926,
			DECADE = 315569260;

		if (offset <= MINUTE)              span = [ '', 'moments' ];
		else if (offset < (MINUTE * 60))   span = [ Math.round(Math.abs(offset / MINUTE)), 'min' ];
		else if (offset < (HOUR * 24))     span = [ Math.round(Math.abs(offset / HOUR)), 'hour' ];
		else if (offset < (DAY * 7))       span = [ Math.round(Math.abs(offset / DAY)), 'day' ];
		else if (offset < (WEEK * 52))     span = [ Math.round(Math.abs(offset / WEEK)), 'week' ];
		else if (offset < (YEAR * 10))     span = [ Math.round(Math.abs(offset / YEAR)), 'year' ];
		else if (offset < (DECADE * 100))  span = [ Math.round(Math.abs(offset / DECADE)), 'decade' ];
		else                               span = [ '', 'a long time' ];

		span[1] += (span[0] === 0 || span[0] > 1) ? 's' : '';
		span = span.join(' ');

		return span + ' ago';
}

function unix(d) {
	d = (d && d.getTime) ? d : new Date();
	return Math.floor(d.getTime()/1000);
}
