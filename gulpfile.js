var gulp = require('gulp');
var gutil = require('gulp-util');
var concat = require('gulp-concat');
var header = require('gulp-header');
var clean = require('gulp-clean');
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
	scripts: ['src/js/**/*.js', '!src/js/dot.min.js'],
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
	).listen(3000);

	gutil.log('HTTP listening on', gutil.colors.yellow('3000'));
});

gulp.task('dot', function() {
	var options = {
		dictionary: 'FancyChat["templates"]',
		varname: 'it'
	};

	return gulp.src(paths.dot)
		.pipe(dot(options))
		.pipe(concat('templates.js'))
		.pipe(header('FancyChat.templates = {};\n'))
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
			//splitOnNewLine: false
		}))
		.pipe(gulp.dest('src/js/'));
});

gulp.task('combine', function() {
	return gulp.src(paths.scripts)
		.pipe(concat('fancy-chat.js'))
		//.pipe(uglify())
		.pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function() {
	return gulp.src(paths.dist)
		.pipe(clean());
});

gulp.task('transitionals', function() {
	var files = [
		'src/css/fancycss.css',
		'src/js/fancycss.js',
		'src/js/templates.js'
	];

	return gulp.src(files)
		.pipe(clean());
});

gulp.task('build', function() {
	// remove clean for now, some shit windows error or something
	run('dot', 'css', 'combine', 'watch');
});

gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['combine']);
	gulp.watch(paths.dot, ['dot']);
	gulp.watch(paths.css, ['css']);

	gulp.watch(paths.dist).on('change', function(f) {
		livereload().changed(f.path);
	});
});

gulp.task('default', ['http', 'build']);
