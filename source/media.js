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

const _ffmpeg = require('fluent-ffmpeg');
const _utils = require('./utils.js');

module.exports.info = function infoMedia(path, cb) {
  _ffmpeg.ffprobe(path, function(err, metadata) {
    if ( err ) {
      console.error(err);
    }
    cb(err ? String(err) : null, metadata);
  });
};

module.exports.play = function playMedia(request, response, path, preset, platform, time) {
  preset = preset || '240p';

  let vcodec = 'libx264';
  let acodec = 'aac';
  let format = 'matroska';
  let mime = 'video/mp4';
  let ioptions = [];
  let ooptions = [];

  switch ( platform ) {
    case 'ios':
      mime = 'video/mp4';

      ooptions.push('-profile:v main');
      ooptions.push('-level 3.1');
      ooptions.push('-preset veryslow');
      ooptions.push('-crf 23'); // 18 - 24
      ooptions.push('-x264-params ref=4');
      ooptions.push('-movflags +faststart');
      //-vf "scale=-2:720:flags=lanczos"
      break;

    case 'firefox':
      mime = 'video/webm';
      format = 'webm';
      vcodec = 'libvpx';
      acodec = 'vorbis';
      break;

    case 'ie':
      mime = 'video/mp4';
      format = 'h264';
      break;
  }

  let profile  = _utils.getConfig().presets[preset];
  time = time || 0;

  _utils.log('MEDIA', path, time, preset, platform);
  _utils.log('USING', vcodec, acodec, format, mime);

  response.writeHead(200, {
    'Content-Type': mime,
    'Connection': 'keep-alive'
  });

  _ffmpeg()
    .input(path)
    .addInputOptions(ioptions)
    .addOutputOptions(ooptions)
    .format(format)
    .fps(profile.video.framerate)
    .size(profile.video.dimension)
    .videoBitrate(profile.video.bitrate)
    .videoCodec(vcodec)
    .audioBitrate(profile.audio.bitrate)
    .audioCodec(acodec)
    .audioChannels(2)
    .seekInput(time)
    .on('error', function(stdout, stderr) {
      response.end();
      console.log('error', stdout, stderr);
    })
    .on('start', function(line) {
      console.log(line);
    })
    .on('end', function() {
      response.end();
    })
    .pipe(response, {
      end: true
    });
};

