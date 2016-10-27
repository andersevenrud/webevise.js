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

///////////////////////////////////////////////////////////////////////////////
// CONFIG
///////////////////////////////////////////////////////////////////////////////

const PORT = 8080;
const MIMES = {
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  json: 'application/json',
  html: 'text/html'
};

///////////////////////////////////////////////////////////////////////////////
// IMPORTS
///////////////////////////////////////////////////////////////////////////////

const _http = require('http');
const _fs = require('fs');
const _url = require('url');
const _path = require('path');
const _wss = require('ws');
const _session = require('simple-session');

const _media = require('./source/media.js');
const _library = require('./source/library.js');
const _utils = require('./source/utils.js');

///////////////////////////////////////////////////////////////////////////////
// HTTP RESPONSE
///////////////////////////////////////////////////////////////////////////////

function respond(request, response, code, mime, content) {
  code = code || 200;
  mime = mime || 'text/html';
  content = content || '';

  response.writeHead(code, {
    'Content-Type': mime,
    'Connection': 'keep-alive'
  });

  response.end(content, 'utf-8');
}

function respondStatic(request, response, path) {
  let fileext = _path.extname(path).substr(1);
  let mime = MIMES[fileext] || 'application/octet-stream';
  let stream = _fs.createReadStream(path, {
    bufferSize: 64 * 1024
  });

  response.writeHead(200, {
    'Content-Type': mime
  });

  stream.on('end', function() {
    response.end();
  });

  stream.pipe(response);
}

function respond404(request, response, path) {
  respond(request, response, 404, null,  'File not found');
}

function respond500(request, response) {
  respond(request, response, 404, null,  'Internal server error');
}

function respondJSON(request, response, data, code) {
  respond(request, response, code, 'application/json', JSON.stringify(data));
}

function respondWebsocket(ws, data) {
  ws.send(JSON.stringify(data));
}

///////////////////////////////////////////////////////////////////////////////
// REQUESTS
///////////////////////////////////////////////////////////////////////////////

function httpRequest(request, response) {
  const url = request.url.split('?')[0];
  const filePath = 'public' + (url === '/' ? '/index.html' : url);
  const sid = _session.init(request, response);
  const method = (request.method || 'GET').toUpperCase();

  function proceed(post) {
    let get = _url.parse(request.url, true).query;

    _utils.log(method, url);

    if ( url === '/play' ) {
      let path = _library.getPath(get.library, get.path);
      _fs.exists(path, function(exists) {
        if ( exists ) {
          _media.play(request, response, path, get.preset, get.platform, get.time);
        } else {
          respond404(request, response, get.path);
        }
      });
    } else {
      _fs.exists(filePath, function(exists) {
        if ( exists ) {
          respondStatic(request, response, filePath);
        } else {
          respond404(request, response, filePath);
        }
      });
    }
  }

  var body = [];
  if ( method === 'POST' ) {
    request.on('data', function() {
      body.push(data);
    });

    request.on('end', function() {
      let post = {};
      if ( body.length ) {
        try {
          post = JSON.parse(Buffer.concat(body));
        } catch ( e ) {}
      }
      proceed(post);
    });
  } else {
    proceed({});
  }
}

function websocketRequest(ws, data) {
  const index = data._index;
  const action = data.action;

  _utils.log('SOCKET', JSON.stringify(data));

  switch ( action ) {
    case 'library':
      if ( typeof data.library !== 'undefined' && data.library !== -1 ) {
        _library.query(data.library, data.path, function(err, res) {
          respondWebsocket(ws, {
            _index: index,
            error: err,
            action: action,
            result: res
          });
        });
      } else {
        _library.list(function(err, res) {
          respondWebsocket(ws, {
            _index: index,
            error: err,
            action: action,
            result: res
          });
        })
      }
      break;

    case 'info':
      var video = _library.getPath(data.library, data.path);
      _media.info(video, function(err, res) {
        respondWebsocket(ws, {
          _index: index,
          error: err,
          action: action,
          result: res
        });
      });
      break;

    default:
      respondWebsocket(ws, {
        _index: index,
        error: 'Invalid action',
        action: action,
        result: null
      });
    break;
  }
}

///////////////////////////////////////////////////////////////////////////////
// SERVER
///////////////////////////////////////////////////////////////////////////////

if ( !_fs.existsSync('./config.json') ) {
  console.error('Can\'t find \'config.json\'');
  process.exit(1);
  return;
}

const server = _http.createServer(httpRequest);
const wss = new (require('ws')).Server({
  server: server
});

wss.on('connection', function(ws) {
  _utils.log('SOCKET', 'Connect');

  ws.on('message', function(msg) {
    websocketRequest(ws, JSON.parse(msg));
  });

  ws.on('close', function() {
  });
});

server.listen(PORT);
