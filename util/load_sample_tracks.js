'use strict';
const ROOM_NAME = 'rap'
const tracksIds = require('./tracksIds').rap


const http = require('http');
const JSONStream = require('JSONStream');
const parser = JSONStream.parse(['results', true]);
const rc = require('../lib/redis-clients').songs;


let rooms = require('../config').rooms;
let skip = 0; // Skip counter


const options = {
  headers: { 'content-type': 'application/json' },
  host: 'itunes.apple.com',
  path: '/lookup?id='+ tracksIds,
  port:80

};

/**
 * Set the rooms in which the songs of a given artist will be loaded.
 */

const updateRooms = function(artistId) {
 
rooms = [ROOM_NAME];
//rooms = ['mixed'];
  /*
  if (artistId === popIds[0]) {
    rooms.push('hits', 'pop');
    // Set the skip counter (there is no need to update the rooms for the next pop artists)
    skip = popIds.length - 1;
  } else if (artistId === rapIds[0]) {
    rooms.push('rap');
    skip = rapIds.length - 1;
  } else {
    rooms.push('oldies', 'rock');
    skip = rockIds.length - 1;
  } 
  */
};

parser.on('data', function(track) {
  if (track.wrapperType === 'artist') {
    if (skip) {
      skip--;
      return;
    }
    updateRooms(track.artistId);
    return;
  }

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
 /*
  rooms.forEach(function(room) {
    const _score = room === 'mixed' ? songId : score;
    rc.zadd(room, _score, songId);
  });
  */

  //Make sure to always update mixed
  // but avoid to lost scores 
  rc.zscore (['mixed', track.trackId], (err, result) => {
    console.log (result)
    if (!result){
      console.log ('entrei')
      rc.zadd('mixed', 30000 , track.trackId);
      rc.zadd(ROOM_NAME, 30000 , track.trackId);
    }
  })
 // rc.zadd(ROOM_NAME, 30000 , track.trackId);

});

parser.on('end', function() {
  rc.quit();
  process.stdout.write('OK\n');
});

process.stdout.write('Loading sample tracks... ');
http.get(options, function(res) {
  res.pipe(parser);
});
/*
rc.del(rooms, function(err) {
  if (err) {
    throw err;
  }
  process.stdout.write('Loading sample tracks... ');
  http.get(options, function(res) {
    res.pipe(parser);
  });
});
*/