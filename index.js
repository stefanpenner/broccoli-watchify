var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var RSVP = require('rsvp');
var mkdirp = require('mkdirp');
var browserify = require('browserify');
var watchify = require('watchify');
var Plugin = require('broccoli-plugin');
var md5Hex = require('md5Hex');

module.exports = Watchify;
function Watchify(inputTree, options) {
  if (!(this instanceof Watchify)) {
    return new Watchify(inputTree, options);
  }
  Plugin.call(this, [inputTree], options);
  this._persistentOutput = true;
  this.options = options;
  this._fileToChecksumMap = Object.create(null);
  this.watchifyData = watchify.args;

  this.outputFile = options && options.outputFile || 'browserify.js';
}

Watchify.prototype = Object.create(Plugin.prototype);
Watchify.prototype.constructor = Watchify;
Watchify.prototype.getDefaultOptions = function () {
  return {
    browserify: {},
    cache: true,
    init: function (browserify) {}
  };
};

Watchify.prototype.writeFileIfContentChanged = function(fullPath, content) {
  var previous = this._fileToChecksumMap[fullPath];
  var next = md5Hex(content);

  if (previous === next) {
    console.log('hit');
    // hit
  } else {
    console.log('miss');
    fs.writeFileSync(fullPath, content);
    this._fileToChecksumMap[fullPath] = next; // update ma, options);
  }
};

Watchify.prototype.build = function (readTree, destDir) {
  var options = _.extend(this.getDefaultOptions(), options);
  var srcDir = this.inputPaths[0];
  var outputFile = this.outputPath + '/' + this.outputFile;
  var outputDir = path.dirname(outputFile);

  mkdirp.sync(outputDir);;

  options.browserify.basedir = srcDir;

  var browserifyOptions = options.cache ? _.extend(options.browserify, this.watchifyData) : options.browserify;
  var w = browserify(browserifyOptions);
  if (options.cache) {
    w = watchify(w);
  }

  options.init(w);

  var plugin = this;
  return new RSVP.Promise(function (resolve, reject) {
    w.bundle(function (err, data) {
      if (err) {
        reject(err);
      } else {
        try {
          plugin.writeFileIfContentChanged(outputFile, data);
          resolve(outputDir);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
};
