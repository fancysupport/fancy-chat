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

var handle_error = function(e) {
	gutil.log(gutil.colors.red(e.message));
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
		dictionary: 'FancySupport["templates"]',
		varname: 'it'
	};

	var d = dot(options)
		.on('error', function(e) {
			handle_error(e);
			d.end();
			return false;
		});

	return gulp.src('src/views/**/*')
		.pipe(d)
		.pipe(concat('templates.js'))
		.pipe(header('FancySupport.templates = {};\n'))
		.pipe(gulp.dest('build'));
});

gulp.task('css', function() {
	var s = stylus({errors: true, compress: false, 'include css': true})
		.on('error', function(e) {
			handle_error(e);
			s.end();
			return false;
		});

	return gulp.src('src/css/**/*')
		.pipe(s)
		.pipe(concat('fancycss.css'))
		.pipe(css2js({
			splitOnNewLine: true
		}))
		.pipe(gulp.dest('build'));
});

gulp.task('js', function() {
	return gulp.src('src/js/**/*')
		.pipe(gulp.dest('build'));
});

gulp.task('combine', function() {
	return gulp.src('build/*.js')
		.pipe(concat('client.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('minify', ['combine'], function() {
	return gulp.src('dist/client.js')
		.pipe(uglify())
		.pipe(concat('client.min.js'))
		.pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
	livereload.listen();

	gulp.watch('build/*', ['minify']);

	gulp.watch('src/js/**/*', ['js']);
	gulp.watch('src/views/**/*', ['dot']);
	gulp.watch('src/css/**/*', ['css']);

	gulp.watch('dist/client.js').on('change', function(f) {
		livereload().changed(f.path);
	});
});

gulp.task('default', ['http', 'minify', 'watch']);
