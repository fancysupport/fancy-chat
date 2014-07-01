var gulp = require('gulp');
var concat = require('gulp-concat');
var header = require('gulp-header');
var clean = require('gulp-clean');
var dot = require('gulp-dot-precompiler');
var run = require('run-sequence');

var paths = {
	scripts: ['src/*.js', '!src/dot.min.js'],
	dot: ['views/**/*.dot', 'views/**/*.def', 'views/**/*.jst'],
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

gulp.task('combine', function() {
	return gulp.src(paths.scripts)
		.pipe(concat('fancy-chat.js'))
		.pipe(gulp.dest(paths.dist));
});

gulp.task('clean', function() {
	return gulp.src(paths.dist)
		.pipe(clean());
});

gulp.task('build', function() {
	run('clean', 'dot', 'combine');
});

gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['combine']);
	gulp.watch(paths.dot, ['dot']);
});

gulp.task('default', ['build']);