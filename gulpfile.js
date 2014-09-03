var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var header = require('gulp-header');
var dot = require('gulp-dot-precompiler');
var run = require('run-sequence');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');
var css2js = require('gulp-css2js');
var http = require('http');
var livereload = require('gulp-livereload');
var ecstatic = require('ecstatic');
var notifier = require('node-notifier');

var paths = {
	scripts: ['src/js/**/*.js', '!src/js/dot.min.js', '!src/js/atomic.js'],
	dot: ['src/views/**/*.dot', 'src/views/**/*.def', 'src/views/**/*.jst'],
	css: ['src/css/**/*.styl', 'src/css/**/*.css'],
	dist: 'build'
};

var handle_error = function(e) {
	gutil.log(gutil.colors.red(e.message));
	if (e.fileName) gutil.log(gutil.colors.red(e.fileName));

	var n = new notifier();
	n.notify({title: 'Fancy Build Error', message: e.message});
};

gulp.task('http', function() {
	http.createServer(
		ecstatic({ root: __dirname + '/' + paths.dist })
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

	return gulp.src(paths.dot)
		.pipe(d)
		.pipe(concat('templates.js'))
		.pipe(header('FancySupport.templates = {};\n'))
		.pipe(gulp.dest('src/js'));
});

gulp.task('css', function() {
	var s = stylus({errors: true, compress: false, 'include css': true})
		.on('error', function(e) {
			handle_error(e);
			s.end();
			return false;
		});

	return gulp.src(paths.css)
		.pipe(s)
		.pipe(concat('fancycss.css'))
		.pipe(css2js({
			splitOnNewLine: true
		}))
		.pipe(gulp.dest('src/js/'));
});

gulp.task('combine', function() {
	return gulp.src(paths.scripts)
		.pipe(concat('client.js'))
		.pipe(gulp.dest(paths.dist));
});

gulp.task('minify', ['combine'], function() {
	return gulp.src('build/client.js')
		.pipe(uglify())
		.pipe(concat('clinet.min.js'))
		.pipe(gulp.dest(paths.dist));
});

gulp.task('build', function() {
	run('dot', 'css', 'minify', 'watch');
});

gulp.task('watch', function() {
	livereload.listen();

	gulp.watch(paths.scripts, ['combine', 'minify']);
	gulp.watch(paths.dot, ['dot']);
	gulp.watch(paths.css, ['css']);

	gulp.watch(paths.dist + '/*').on('change', function(f) {
		livereload().changed(f.path);
	});
});

gulp.task('default', ['http', 'build']);
