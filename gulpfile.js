var gulp = require('gulp');
var concat = require('gulp-concat');
var header = require('gulp-header');
var clean = require('gulp-clean');
var dot = require('gulp-dot-precompiler');
var run = require('run-sequence');
var uglify = require('gulp-uglify');

var paths = {
	scripts: ['src/**/*.js', '!src/dot.min.js'],
	dot: ['views/**/*.dot', 'views/**/*.def', 'views/**/*.jst'],
	css: ['src/**/*.styl'],
	dist: 'build'
};

gulp.task('dot', function() {
	var options = {
		dictionary: 'FancyChat["templates"]',
		varname: 'it'
	};

	return gulp.src(paths.dot)
		.pipe(dot(options))
		.pipe(concat('templates.js'))
		.pipe(header('FancyChat.templates = {};\n'))
		.pipe(gulp.dest('src'));
});

gulp.task('css', function() {
	var stylus = require('gulp-stylus');
	var css2js = require('gulp-css2js');
	var cssmin = require('gulp-cssmin');

	return gulp.src(paths.css)
		.pipe(stylus({
			errors: true
		}))
		.pipe(concat('fancy.css'))
		.pipe(cssmin()) // does this even do anything?
		.pipe(css2js({
			splitOnNewLine: false
		}))
		.pipe(gulp.dest('src'));
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

gulp.task('transitionals', ['combine'], function() {
	var files = [
		'src/fancy.css',
		'src/fancy.js',
		'src/templates.js'
	];

	return gulp.src(files)
		.pipe(clean());
});

gulp.task('build', function() {
	run('clean', 'dot', 'css', 'combine', 'transitionals');
});

gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['combine', 'transitionals']);
	gulp.watch(paths.dot, ['dot']);
	gulp.watch(paths.css, ['css']);
});

gulp.task('default', ['build']);