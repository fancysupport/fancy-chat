(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory);
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.FancySupport = factory(root);
	}
})(this, function(root) {
