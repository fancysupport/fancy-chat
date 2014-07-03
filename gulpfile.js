var gulp = require('gulp');
var concat = require('gulp-concat');
var header = require('gulp-header');
var clean = require('gulp-clean');
var dot = require('gulp-dot-precompiler');
var run = require('run-sequence');
var uglify = require('gulp-uglify');
var stylus = require('gulp-stylus');
var css2js = require('gulp-css2js');


var paths = {
	scripts: ['src/js/**/*.js', '!src/js/dot.min.js'],
	dot: ['src/views/**/*.dot', 'src/views/**/*.def', 'src/views/**/*.jst'],
	css: ['src/css/**/*.styl', 'src/css/**/*.css'],
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
		.pipe(gulp.dest('src/js'));
});

gulp.task('css', function() {
	return gulp.src(paths.css)
		.pipe(stylus({
			errors: true,
			compress: true
		}))
		.pipe(concat('fancycss.css'))
		.pipe(css2js({
			splitOnNewLine: false
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
	run('clean', 'dot', 'css', 'combine', 'watch');
});

gulp.task('watch', function() {
	gulp.watch(paths.scripts, ['combine']);
	gulp.watch(paths.dot, ['dot']);
	gulp.watch(paths.css, ['css']);
});

gulp.task('default', ['build']);