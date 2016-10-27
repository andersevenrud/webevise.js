# webevise.js

Stream you video library to any device supporting HTML5 video. Uses ffmpeg to transcode videos on-the-fly.

## Dependencies

- `nodejs` and `npm`
- `ffmpeg`

## Install

```
$ npm install
$ cp config.example.json config.json
$ edit config.json
$ node server.js
```

Then open your browser to [http://localhost:8080](http://localhost:8080)

## Status

In very early stages, but is in a workable state in WebKit for desktop users.

### Features

- [x] User interace
- [x] HTTP Server
- [x] Websocket Server
- [x] FFMpeg integration
- [x] Start media at a given position
- [x] Read defaults from configuration file
- [x] Browsing of media
- [x] Lights out
- [x] Show curent/end time
- [x] Quality presets
- [x] Media controls
- [ ] Seeking support **in progress**
- [ ] Filtering of media browsing
- [ ] Loading indicators
- [ ] View media information
- [ ] Home Screen
- [ ] Thumbnail view
- [ ] Fancy user interface animations and transitions
- [ ] Playlists
- [ ] Authentication

### Browser support:

*All browsers will techically work, but right now the backend only has one encoding target:*

- [x] Google Chrome
- [x] Mozilla Firefox
- [ ] Internet Explorer 11+ / Edge
- [ ] Google Android
- [ ] Apple iOS

### Tested on:

- Arch Linux
- Ubuntu Linux
