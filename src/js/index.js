(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.FancySupport = factory(root);
	}
})(this, function(root) {
	var FancySupport = {};

// imports must be at teh start of the line, smash doesn't work otherwise 
import "md5";
import "timeago";
import "detect_ie";
import "utils";
import "api";
import "store";
import "view";
import "core";
import "templates";
import "fancycss";

	return FancySupport;
});
