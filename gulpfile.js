'use strict';

/*
 * -----------------------------------------------------------------------------
 * Load libraries and configs
 * -----------------------------------------------------------------------------
 */

// Third-party libraries
var gulp          = require('gulp');
var gulpUtil      = require('gulp-util');
var opn           = require('opn');
var concat        = require('gulp-concat');
var clean         = require('gulp-clean');
var runSequence   = require('run-sequence');
var sass          = require('gulp-ruby-sass');
var sourcemaps    = require('gulp-sourcemaps');
var autoprefixer  = require('gulp-autoprefixer');
var cached        = require('gulp-cached');
var eslint        = require('gulp-eslint');
var remember      = require('gulp-remember');
var gulpIf        = require('gulp-if');
var uglify        = require('gulp-uglify');
var wrap          = require('gulp-wrap');
var rev           = require('gulp-rev');
var minifyCss     = require('gulp-clean-css');
var path          = require('path');
var newer         = require('gulp-newer');
var livereload    = require('gulp-livereload');
var replace       = require('gulp-replace');
var webserver     = require('gulp-webserver');
var rename        = require('gulp-rename');

// Local files
var packageJson   = require('./package.json');
var config        = require('./config.json');

// Flags
var production    = gulpUtil.env.production;  // `--production`
var openBrowser   = gulpUtil.env.open;        // `--open`


/*
 * -----------------------------------------------------------------------------
 * Tasks
 * -----------------------------------------------------------------------------
 */

gulp.task('clean', function () {
  // Clear cache as well
  cached.caches = {};

  var src = production ?
    gulp.src(config.buildPaths.production) :
    gulp.src(config.buildPaths.development);

  return src.pipe(clean({force: true}));
});

gulp.task('clearCache', function () {
  cached.caches = {};
});

gulp.task('images', function () {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;

  dest += config.paths.assets + config.paths.images;

  return gulp
    .src(
      config.paths.source +
      config.paths.assets +
      config.paths.images +
      '/**/*.{jpg,gif,png,svg}'
    )
    // Only pass files that have a newer time stamp
    .pipe(newer(dest))
    .pipe(gulp.dest(dest))
    .pipe(livereload());
});

gulp.task('videos', function () {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;

  dest += config.paths.assets + config.paths.videos;

  return gulp
    .src(
      config.paths.source +
      config.paths.assets +
      config.paths.videos +
      '/**/*.{mp4,webm}'
    )
    // Only pass files that have a newer time stamp
    .pipe(newer(dest))
    .pipe(gulp.dest(dest))
    .pipe(livereload());
});

gulp.task('index', function () {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;

  return gulp
    .src(config.files.index.map(function (path) {
      return config.paths.source + path;
    }))
    // Only pass files that have a newer time stamp
    .pipe(newer(dest))
    .pipe(gulp.dest(dest))
    .pipe(livereload());
});

gulp.task('javascript', function () {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;

  dest += config.paths.assets + config.paths.scripts;

  // Run task on each collection of JavaScript files defined in `config`.
  var tasks = config.files.js.map(function(feature) {
    return gulp
      .src(feature.files)
      // Cache files for linting to speed up the task. Only changed files will
      // be linted
      .pipe(cached('lint-' + feature.name))
      // Pipe in ESLint with configurations being picked up from `.eslintrc`
      .pipe(eslint({
        useEslintrc: true
      }))
      // Output lint results on console
      .pipe(eslint.formatEach('stylish', process.stderr))
      // Exit with code 1 on error
      .pipe(eslint.failOnError())
      // Bring back all files
      .pipe(remember('lint-' + feature.name))
      // Init source map
      .pipe(sourcemaps.init())
      // Add origin to source
      .pipe(wrap('// FILE: <%= file.path %>\n<%= contents %>\n\n'))
      .pipe(concat(feature.name))
      // Unglify JavaScript if we start Gulp in production mode. Otherwise
      // concat files only.
      .pipe(
        gulpIf(
          production,
          uglify()
        )
      )
      .pipe(
        gulpIf(
          production,
          sourcemaps.write('.')
        )
      )
      // Write ouput to either the development or production directory
      .pipe(gulp.dest(dest))
      .pipe(livereload());
   });

  return tasks;
});

gulp.task('sass', function () {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;

  dest += config.paths.assets + config.paths.styles;

  var sassPipe;

  if (production) {
    sassPipe = sass(
      config.paths.source +
      config.paths.assets +
      config.paths.styles +
      '/index.scss',
      {
        sourcemap: true
      }
    );
  } else {
    sassPipe = sass(
      config.paths.source +
      config.paths.assets +
      config.paths.styles +
      '/index.scss'
    );
  }

  return sassPipe
    // Catch SASS errors
    .on('error', function (err) {
      console.error('Error!', err.message);
    })
    // Add vendor prefixes in production mode
    .pipe(
      gulpIf(
        production,
        autoprefixer({
          browsers: config.browsers,
          cascade: true
        })
      )
    )
    // Minify stylesheet in production mode
    .pipe(
      gulpIf(
        production,
        minifyCss()
      )
    )
    .pipe(rename({
      basename: 'styles'
    }))
    // Write sourcemap
    .pipe(sourcemaps.write('.'))
    // Write CSS
    .pipe(gulp.dest(dest))
    .pipe(livereload());
});

gulp.task('open', function() {
  var dest = production ?
    config.buildPaths.production : config.buildPaths.development;
  // `--open`
  if (openBrowser) {
    opn('http://' + config.server.host + ':' + config.server.port + '/' + dest);
  }
});

gulp.task('webserver', function() {
  gulp.src( '.' )
    .pipe(webserver({
      host:             config.server.host,
      port:             config.server.port,
      livereload:       true,
      directoryListing: false
    }));
});


/*
 * -----------------------------------------------------------------------------
 * Watcher
 * -----------------------------------------------------------------------------
 */

gulp.task('watch', function() {
  livereload.listen();

  gulp.watch(
    'config.json',
    ['images', 'index', 'javascript', 'sass']
  );

  gulp.watch(
    config.paths.source +
    config.paths.assets +
    config.paths.images +
    '/**/*.{jpg,gif,png,svg}',
    ['images']
  );

  gulp.watch(
    config.files.index.map(function (path) {
      return config.paths.source + path;
    }),
    ['index']
  );

  gulp.watch(
    [].concat.apply(
      [],
      config.files.js.map(function (feature) {
        return feature.files;
      })
    ),
    ['javascript']
  );

  gulp.watch(
    config.paths.source +
    config.paths.assets +
    config.paths.styles +
    '/**/*.scss',
    ['sass']
  );
});


/*
 * -----------------------------------------------------------------------------
 * Compiled and default tasks
 * -----------------------------------------------------------------------------
 */

gulp.task('build', function(callback) {
  runSequence(
    'clean',
    [
      'images', 'index', 'javascript', 'sass', 'videos'
    ],
    callback);
});

gulp.task('default', function(callback) {
  runSequence(
    [
      'build', 'webserver', 'watch'
    ],
    'open',
    callback
  );
});
