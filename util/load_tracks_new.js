'use strict';

const ROOM_NAME = 'hits'
const tracksIds = require('./tracksIds')[ROOM_NAME]

const http = require('http');
const JSONStream = require('JSONStream');
const parser = JSONStream.parse(['results', true]);
const rc = require('../lib/redis-clients').songs;

const options = {
  headers: { 'content-type': 'application/json' },
  host: 'itunes.apple.com',
  path: '/lookup?id='+ tracksIds,
  port:80
};

parser.on('data', async function(track) {
  console.log ('adding track: ' + track.trackName + ' ...');
    rc.exists(`song:${track.trackId}`, async (err, res) => {
    if (!res){
       rc.hmset(
        'song:' + track.trackId,
        'artistName',
        track.artistName,
        'trackName',
        track.trackName,
        'trackViewUrl',
        track.trackViewUrl,
        'previewUrl',
        track.previewUrl,
        'artworkUrl60',
        track.artworkUrl60,
        'artworkUrl100',
        track.artworkUrl100,
        'bestScore',
        30000,
        'userBestScore',
        'binb'
      );
    } 
  });
  rc.zscore([ROOM_NAME,  track.trackId], (err, res) => {
    if (!res){
      rc.zadd(ROOM_NAME, 30000, track.trackId);
    }
  })
});

process.stdout.write('Loading sample tracks... ');
http.get(options, function(res) {
  res.pipe(parser);
});
