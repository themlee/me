"use strict"

const gulp = require('gulp');
const runSequence = require('run-sequence');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const image = require('gulp-image');
const rename = require("gulp-rename");
const gulpCopy = require('gulp-copy');
const concat = require('gulp-concat-util');
const minify = require('gulp-minify-css');
const gutil = require('gulp-util');
const critical = require('critical').stream;
const autoprefixer = require('gulp-autoprefixer');
const cachebust = require('gulp-cache-bust');
const clean = require('gulp-clean');
const template = require('gulp-md-template');
const handlebars = require('gulp-compile-handlebars');
const replace = require('gulp-replace');
const fs = require('fs');
const gulpAmpValidator = require('gulp-amphtml-validator');
var articles = JSON.parse(fs.readFileSync('./content/articles.json'));

gulp.task('amphtml:validate', () => {
  return gulp.src('dist/*.html')
    // Validate the input and attach the validation result to the "amp" property 
    // of the file object.  
    .pipe(gulpAmpValidator.validate())
    // Print the validation results to the console. 
    .pipe(gulpAmpValidator.format())
    // Exit the process with error code (1) if an AMP validation error 
    // occurred. 
    .pipe(gulpAmpValidator.failAfterError());
});

// Clean out the dist folder
gulp.task('clean_without_images', () => {
  return gulp.src(['./dist/assets/css', './dist/*.*', './dist/CNAME'], {
    read: false,
    force: true
  })
  .pipe(clean());
});

// Clean out the dist folder
gulp.task('clean', () => {
  return gulp.src('./dist', {
    read: false,
    force: true
  })
  .pipe(clean());
});

// Clean out the dist folder
gulp.task('clean_tmp', () => {
  return gulp.src('./dist/tmp', {
    read: false,
    force: true
  })
  .pipe(clean());
});

gulp.task('handlebars', function () {
  var templateData = { cells: articles };
  var options = {
    ignorePartials: false,
    helpers : {
      withAfter: function(array, idx, options) {
        return options.fn(array[idx + 1]);
      },
      withBefore: function(array, idx, options) {
        return options.fn(array[idx - 1]);
      }
    }
  };
  return gulp.src('src/*.html')
    .pipe(handlebars(templateData, options))
    .pipe(replace('[[', '{{'))
    .pipe(replace(']]', '}}'))
    .pipe(gulp.dest('./dist/tmp'));
});

gulp.task('markdown', function () {
  return gulp.src('./dist/tmp/*.html')
    .pipe(template('./content'))
    .pipe(gulp.dest('./dist'));
});

// Copy files
gulp.task('copy', () => {
   return gulp.src([
     // 'src/*.html',
     'src/CNAME',
     'src/*.xml',
     'src/*.json',
     'src/*.ico',
     'src/*.png',
     'src/*.svg'
   ])
   .pipe(gulp.dest('dist'));
});

// SASS compile
gulp.task('sass', () => {
  // Autoprefixer configuration
  var autoprefixerOptions = {
    browsers: [
      'last 2 versions',
      '> 5%',
      'Firefox ESR'
    ]
  };

  return gulp
    .src('src/assets/scss/**/*.scss')
    // .pipe(sourcemaps.init())
    .pipe(replace('@@cell_count@@', articles.length + 1))
    .pipe(sass({
      errLogToConsole: true,
      outputStyle: 'compressed',
      includePaths: []
    }))
    .on('error', sass.logError)
    .pipe(autoprefixer(autoprefixerOptions))
    // .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist/assets/css'))
  ;
});

// Minify images
gulp.task('image', () => {
  return gulp.src('src/assets/image/**')
    .pipe(image())
    .pipe(gulp.dest('dist/assets/image'));
});

// Generate & Inline Critical-path CSS
// gulp.task('critical', () => {
//   return gulp.src('dist/*.html')
//     .pipe(critical({
//       base: 'dist/',
//       inline: false,
//       css: [
//         'dist/assets/css/style.css',
//         'dist/assets/css/one.css'
//       ],
//       minify: true
//     }))
//     .on('error', (err) => {
//       gutil.log(gutil.colors.red(err.message));
//     })
//     .pipe(gulp.dest('dist'));
// });

// Publish files to S3
gulp.task("cachebuster", () => {
  gulp.src('dist/*.html')
    .pipe(cachebust({
      type: 'timestamp'
    }))
    .pipe(gulp.dest('dist'));
});

// Watch tasks
gulp.task('watch', function () {
  gulp.watch(['src/assets/scss/**/*.scss', 'src/**/*.html', 'content/**/*.md', 'content/*.json', 'src/*.html'], ['build_without_images'])
});

gulp.task('watch_images', function () {
  gulp.watch('src/assets/image/*.*', ['build'])
});

// Build task
gulp.task('build_without_images', (callback) => {
  runSequence('clean_without_images', 'handlebars', 'markdown', 'clean_tmp', 'copy', 'sass', 'cachebuster', callback) //, 'critical'
});

// Build task
gulp.task('build', (callback) => {
  runSequence('clean', 'handlebars', 'markdown', 'clean_tmp', 'copy', 'image', 'sass', 'cachebuster', callback) //, 'critical'
});

// Default task
gulp.task('default', ['watch', 'watch_images', 'build']);
