var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var header = require('gulp-header');
var dot = require('gulp-dot-precompiler');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');
var css2js = require('gulp-css2js');
var http = require('http');
var livereload = require('gulp-livereload');
var ecstatic = require('ecstatic');
var notifier = require('node-notifier');
var exec = require('child_process').exec;

var handle_error = function(e) {
	gutil.log(gutil.colors.red(e));
	if (e.fileName) gutil.log(gutil.colors.red(e.fileName));

	var n = new notifier();
	n.notify({title: 'Fancy Build Error', message: e.message});
};

gulp.task('http', function() {
	http.createServer(
		ecstatic({ root: __dirname + '/dist' })
	).listen(3001);

	gutil.log('HTTP listening on', gutil.colors.yellow('3001'));
});

gulp.task('dot', function() {
	var options = {
		dictionary: '_TEMPLATES',
		varname: 'it',
		selfcontained: false
	};

	var d = dot(options)
		.on('error', function(e) {
			handle_error(e);
			d.end();
			return false;
		});

	return gulp.src('src/views/**/*')
		.pipe(d)
		.pipe(concat('../build/templates.js'))
		.pipe(header('var _TEMPLATES = {};\n'))
		.pipe(gulp.dest('build'));
});

gulp.task('css', function() {
	var s = stylus({errors: true, compress: true, 'include css': true})
		.on('error', function(e) {
			handle_error(e);
			s.end();
			return false;
		});

	return gulp.src('src/css/fancy.styl')
		.pipe(s)
		.pipe(concat('../build/fancycss.css'))
		.pipe(css2js({
			splitOnNewLine: true
		}))
		.pipe(gulp.dest('build'));
});

gulp.task('copy-js', function() {
	return gulp.src('src/js/**/*')
		.pipe(gulp.dest('build'));
});

gulp.task('combine', ['copy-js', 'dot', 'css'], function(cb) {
	exec('smash build/index.js > build/client.js', function(err) {
		if (err) handle_error(err);
		if (cb) cb();
	});
});

gulp.task('build', ['combine'], function() {
	return gulp.src('build/client.js')
		.pipe(concat('client.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('minify', ['build'], function() {
	var u = uglify()
		.on('error', function(e) {
			handle_error(e);
			u.end();
			return false;
		});

	return gulp.src('dist/client.js')
		.pipe(u)
		.pipe(concat('client.min.js'))
		.pipe(gulp.dest('dist'))
		.pipe(livereload());
});

gulp.task('watch', function() {
	livereload.listen();
	gulp.watch(['src/**/*'], ['minify']);
});

gulp.task('default', ['http', 'minify', 'watch']);
