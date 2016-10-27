/*!
  webevise.js

  Copyright (c) 2016 Anders Evenrud <andersevenrud@gmail.com>

  Permission is hereby granted, free of charge, to any person obtaining a copy of
  this software and associated documentation files (the "Software"), to deal in
  the Software without restriction, including without limitation the rights to
  use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
  of the Software, and to permit persons to whom the Software is furnished to do
  so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
  OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
  ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
  OTHER DEALINGS IN THE SOFTWARE.
*/
const _path = require('path');
const _fs = require('fs');
const _utils = require('./utils.js');

module.exports.getPath = function getMediaPath(library, path) {
  const libraries = _utils.getConfig().libraries;
  return _path.join(libraries[library], path || '/');
}

module.exports.list = function(cb) {
  const libraries = _utils.getConfig().libraries;
  cb(null, libraries.map(function(i) {
    return _path.basename(i);
  }));
};

module.exports.query = function queryLibrary(library, path, cb) {
  path = path || '/';

  const root = module.exports.getPath(library, path);
  _fs.readdir(root, function(err, list) {
    if ( err ) {
      cb(err);
    } else {
      let result = list.filter(function(iter) {
        return iter.substr(0, 1) !== '.';
      }).map(function(iter) {
        let isdir = _fs.lstatSync(_path.join(root, iter)).isDirectory();
        return {
          library: {
            index: library,
            path: path
          },
          media: !isdir,
          path: _path.join(path, iter),
          filename: _path.basename(iter)
        };
      });

      if ( path !== '/' && path !== '.' ) {
        result.unshift({
          library: {
            index: library,
            path: _path.dirname(path) || '/'
          },
          media: false,
          path: _path.dirname(path),
          filename: '..'
        });
      }

      cb(false, result);
    }
  });
};
