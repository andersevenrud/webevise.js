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
(function() {
  var currentMedia;

  /////////////////////////////////////////////////////////////////////////////
  // HELPERS
  /////////////////////////////////////////////////////////////////////////////

  function buildURL(obj, url) {
    var parts = Object.keys(obj).map(function(k) {
      return k + '=' + encodeURIComponent(String(obj[k]));
    });
    return (url || '') + '?' + parts.join('&');
  }

  function buildTimestamp(seconds) {
    var c = parseInt(seconds || 0, 10);
    var m = 0;
    var s = 0;

    if ( c > 0 ) {
      m = Math.floor(c / 60);
      s = c % 60;
    } else if ( c < 0 ) {
      return '-0:00';
    }

    if ( s < 10 ) {
      s = '0' + String(s);
    }
    return [m, s].join(':');
  }

  /////////////////////////////////////////////////////////////////////////////
  // PROTOTYPES
  /////////////////////////////////////////////////////////////////////////////

  Node.prototype.clear = function() {
    while ( this.lastChild ) {
      this.removeChild(this.lastChild);
    }
  };

  ['forEach', 'every', 'map'].forEach(function(n) {
    ['HTMLCollection', 'NodeList', 'FileList'].forEach(function(p) {
      window[p].prototype[n] = Array.prototype[n];
    });
  });

  /////////////////////////////////////////////////////////////////////////////
  // CONNECTION
  /////////////////////////////////////////////////////////////////////////////

  var Connection = (function() {
    var socket;
    var _index = 0;
    var _wait = {};

    function sendMessage(data, cb) {
      var msg = data;
      if ( typeof cb === 'function'  ) {
        msg._index = _index++;
        _wait[msg._index] = cb;
      }
      console.warn('send', msg);
      socket.send(JSON.stringify(msg));
    }

    function initConnection(onopen) {
      var wsAddr = window.location.href.replace(/^http?/, 'ws');
      socket = new WebSocket(wsAddr);
      socket.onmessage = function(msg) {
        var data = JSON.parse(msg.data);
        console.debug('onmessage', data);
        if ( typeof data._index === 'number' ) {
          _wait[data._index](data);
          delete _wait[data.index];
        }
      };

      socket.onopen = onopen;

      socket.onclose = function() {
        socket = null;
      };
    }

    return {
      init: initConnection,
      send: sendMessage
    };
  })();

  /////////////////////////////////////////////////////////////////////////////
  // USER INTERFACE
  /////////////////////////////////////////////////////////////////////////////

  var UserInterface = (function() {
    var $status = document.getElementById('StatusTime');

    function onMediaAction(action) {
      console.info(action);
      if ( action === 'pause' ) {
        MediaPlayer.pause();
      } else if ( action === 'play' ) {
        MediaPlayer.play();
      } else if ( action === 'stop' ) {
        MediaPlayer.stop();
      } else if ( action === 'lightsout' ) {
        if ( document.body.classList.contains('dark') ) {
          document.body.classList.remove('dark');
        } else {
          document.body.classList.add('dark');
        }
      } else if ( action === 'quality' ) {
        document.getElementById('SelectQuality').style.display = 'block';
      }
    }

    function selectView(id) {
      function _fn(el) {
        var value = el.tagName === 'BUTTON'
          ? el.getAttribute('data-view')
          : el.getAttribute('id');

        el.classList.remove('active');
        if ( value === id ) {
          el.classList.add('active');
        }

        el.scrollTop = 0;
        window.scrollTop = 0;
      }

      document.querySelectorAll('#Menu > button').forEach(_fn);
      document.querySelectorAll('main > section').forEach(_fn);
    }

    function updateTime() {
      $status.innerHTML = MediaPlayer.getPosition(true) + ' / ' + MediaPlayer.getDuration(true);
    }

    function toggleControlButtons(s) {
      if ( s === 1 ) {
        document.querySelector('button[data-action="play"]').setAttribute('disabled', 'disabled');
        document.querySelector('button[data-action="pause"]').removeAttribute('disabled');
        document.querySelector('button[data-action="stop"]').removeAttribute('disabled');
      } else if ( s === 2 ) {
        document.querySelector('button[data-action="play"]').removeAttribute('disabled');
        document.querySelector('button[data-action="pause"]').setAttribute('disabled', 'disabled');
        document.querySelector('button[data-action="stop"]').setAttribute('disabled', 'disabled');
      } else {
        document.querySelector('button[data-action="play"]').setAttribute('disabled', 'disabled');
        document.querySelector('button[data-action="pause"]').setAttribute('disabled', 'disabled');
        document.querySelector('button[data-action="stop"]').setAttribute('disabled', 'disabled');
        document.querySelector('button[data-action="quality"]').setAttribute('disabled', 'disabled');
        return;
      }

      document.querySelector('button[data-action="quality"]').removeAttribute('disabled');
    }

    function initUserInterface() {
      document.getElementById('Menu').addEventListener('click', function(ev) {
        var target = ev.target || ev.srcElement;
        if ( target.tagName === 'BUTTON' ) {
          if ( target.hasAttribute('data-view') ) {
            selectView(target.getAttribute('data-view'));
          } else if ( target.hasAttribute('data-action') ) {
            onMediaAction(target.getAttribute('data-action'));
          }
        }
      }, true);

      document.querySelector('#SelectQuality > ul').addEventListener('click', function(ev) {
        var target = ev.target || ev.srcElement;
        if ( target.tagName === 'LI' && target.hasAttribute('data-value') ) {
          MediaPlayer.setQuality(target.getAttribute('data-value'));
        }
        document.getElementById('SelectQuality').style.display = 'none';
      });
    }

    return {
      init: initUserInterface,
      view: selectView,
      updateTime: updateTime,
      buttons: toggleControlButtons
    };
  })();

  /////////////////////////////////////////////////////////////////////////////
  // LIBRARY
  /////////////////////////////////////////////////////////////////////////////

  var Library = (function() {
    var $selectLibrary;
    var $listMedia;

    function onLibraryResponse(list, root, path) {
      $listMedia.clear();

      list.sort(function(a, b) {
        if ( a.media < b.media ) return -1;
        if ( a.media > b.media ) return 1;
        return 0;
      });

      if ( root ) {
        $selectLibrary.clear();
        list.forEach(function(name, index) {
          var option = document.createElement('option');
          option.setAttribute('value', String(index));
          option.appendChild(document.createTextNode(name));
          $selectLibrary.appendChild(option);
        })
      } else {
        list.forEach(function(iter, index) {
          var span = document.createElement('span');
          span.appendChild(document.createTextNode(iter.filename));

          var img = document.createElement('i');
          img.className = 'fa fa-' + (iter.media ? 'file-video-o' : 'folder-o');

          var li = document.createElement('li');
          li.setAttribute('data-library', String(iter.library.index));
          li.setAttribute('data-path', String(iter.path));
          li.setAttribute('data-filename', String(iter.filename));
          li.setAttribute('data-media', String(iter.media));

          li.appendChild(img);
          li.appendChild(span);
          $listMedia.appendChild(li);
        });
      }
    }

    function onLibrarySelect(index) {
      Connection.send({
        action: 'library',
        library: index,
        path: '/'
      }, function(response) {
        if ( !response.error ) {
          onLibraryResponse(response.result, false, '/');
        }
      })
    }

    function onPathSelect(path) {
      Connection.send({
        action: 'library',
        library: $selectLibrary.selectedIndex,
        path: path
      }, function(response) {
        if ( !response.error ) {
          onLibraryResponse(response.result, false, path);
        }
      })
    }

    function onMediaSelect(library, path) {
      UserInterface.view('Player');
      console.warn('onMediaSelect', library, path)
      currentMedia = null;

      Connection.send({
        action: 'info',
        library: library,
        path: path
      }, function(response) {
        if ( response.error ) {
          console.error(response);
          return;
        }

        currentMedia = { // TODO
          library: library,
          path: path,
          duration: response.result.format.duration
        };

        console.log('info', response.result);

        MediaPlayer.open(library, path, 0)
      })
    }

    function initLibrary() {
      $selectLibrary = document.getElementById('SelectLibrary');
      $selectLibrary.addEventListener('change', function() {
        onLibrarySelect(this.selectedIndex);
      });

      $listMedia = document.getElementById('ListMedia');
      $listMedia.addEventListener('click', function(ev) {
        var target = ev.target || ev.srcElement;
        if ( target.tagName === 'SPAN' ) {
          target = target.parentNode;

          var library = parseInt(target.getAttribute('data-library'), 10);
          var path = target.getAttribute('data-path');

          if ( target.getAttribute('data-media') === 'true' ) {
            onMediaSelect(library, path);
          } else {
            onPathSelect(path);
          }
        }
      }, true);

      Connection.send({
        action: 'library'
      }, function(response) {
        if ( !response.error ) {
          onLibraryResponse(response.result, true);
          if ( response.result.length ) {
            onLibrarySelect(0);
          }
        }
      });
    }

    return {
      init: initLibrary
    };
  })();

  /////////////////////////////////////////////////////////////////////////////
  // MEDIA PLAYER
  /////////////////////////////////////////////////////////////////////////////

  var MediaPlayer = (function() {
    var $video = document.getElementById('VideoPlayer');

    var isPlaying = false;
    var preset = localStorage.getItem('preset') || '240p';
    var platform = (function(a) {
      if ( a.match(/i(OS|Pad|Pod)/)  ) {
        return 'ios';
      } else if ( a.toLowerCase().indexOf('android') !== -1 ) {
        return 'android';
      } else if ( a.toLowerCase().match(/trident|msie|edge/) ) {
        return 'ie';
      } else if ( a.toLowerCase().indexOf('firefox') !== -1 ) {
        return 'firefox';
      } else if ( a.toLowerCase().indexOf('webkit') !== -1 ) {
        return 'chrome';
      }
      return 'unknown';
    })(navigator.userAgent);

    function initMediaPlayer() {
      /* TODO
      $video.duration = function() {
        return currentMedia.duration;
      };

      $video.oldCurrentTime = $video.currentTime;
      $video.currentTime = function(time) {
        if ( typeof time === 'undefined' ) {
          return $video.oldCurrentTime() + $video.start;
        }
        _play(time);
      };
      */

      $video.addEventListener('loadstart', function() {
        console.warn('loadstart');
        isPlaying = false;
        UserInterface.buttons(false);
      });

      $video.addEventListener('loadeddata', function() {
        console.warn('loadeddata');
        isPlaying = false;
        UserInterface.buttons(1);
        $video.play();
      });

      $video.addEventListener('play', function() {
        isPlaying = true;
        UserInterface.buttons(1);
      });

      $video.addEventListener('pause', function() {
        isPlaying = false;
        UserInterface.buttons(2);
      });

      $video.addEventListener('timeupdate', function() {
        isPlaying = true;
        UserInterface.updateTime();
      });
    }

    function openMedia(library, path, time) {
      var url = buildURL({
        library: library,
        path: path,
        time: time,
        preset: preset,
        platform: platform
      }, '/play');

      $video.src = url;
      $video.start = time || 0;

      if ( time ) {
        //TODO
        //$video.oldCurrentTime(0);
        $video.currentTime = 0;
      }

      //$video.play();
    }

    function controlPlay() {
      $video.play();
    }

    function controlPause() {
      $video.pause();
    }

    function controlStop() {
      $video.pause();
      $video.currentTime = 0;

      setTimeout(function() {
        UserInterface.buttons(false);
      }, 100);
    }

    function setMediaQuality(q) {
      preset = q;
      localStorage.setItem('preset', preset);

      if ( isPlaying ) {
        MediaPlayer.open(currentMedia.library, currentMedia.path, $video.currentTime);
      }
    }

    function getMediaPosition(formatted) {
      var t = $video.currentTime;
      if ( formatted ) {
        t = buildTimestamp(t);
      }
      return t;
    }

    function getMediaDuration(formatted) {
      var t = currentMedia.duration ? currentMedia.duration : -1;
      if ( formatted ) {
        t = buildTimestamp(t);
      }
      return t;
    }

    return {
      init: initMediaPlayer,
      open: openMedia,
      play: controlPlay,
      pause: controlPause,
      stop: controlStop,
      getDuration: getMediaDuration,
      getPosition: getMediaPosition,
      setQuality: setMediaQuality
    };
  })();

  /////////////////////////////////////////////////////////////////////////////
  // MAIN
  /////////////////////////////////////////////////////////////////////////////

  window.onload = function onWindowLoad() {
    UserInterface.init();
    MediaPlayer.init();
    Connection.init(function() {
      Library.init();
    });

    UserInterface.view('Library');
  };
})()
