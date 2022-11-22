const songsdb = require('./redis-clients').songs;
const userdb = require('./redis-clients').users;
const allRooms = require('../config.json').rooms;

exports.trackStats = function (userStats, trackId, guess) {
    if (userStats.guesstime > 1000){
        for (let i = 0; i < allRooms.length; i++) {
            let room = allRooms[i];
            songsdb.zscore([room, trackId], (err, results) => {
                if (results) {
                    songsdb.hmget(['song:' + trackId, `bestScore:${room}`, `trackName`], (err, replies) => {
                        if (err) {
                            throw err;
                        }
                        const [bestScore, trackName] = replies;
                        if (!bestScore || userStats.guesstime && userStats.guesstime < bestScore) {
                            songsdb.hmset('song:' + trackId, `userBestScore:${room}`, userStats.nickname, `bestScore:${room}`, userStats.guesstime);
                            songsdb.zadd(room, userStats.guesstime, trackId);
                        }
                        userdb.zscore([`${userStats.nickname}:${room}`, trackName], (err, userTrackGuessTime) => {
                            // add if the song id is not set yet
                            if (!userTrackGuessTime) {
                                userdb.zadd(`${userStats.nickname}:${room}`, userStats.guesstime, trackName);
                                songsdb.hmset(`${userStats.nickname}:${room}:${trackName}`, 'shortcut', `${guess.artist} - ${guess.title}`, 'guessedTime', userStats.guesstime);
                            }
                            // if the id song exists in set, check if current user guess time is lower than before
                            else if (userStats.guesstime < userTrackGuessTime) {
                                userdb.zadd(`${userStats.nickname}:${room}`, userStats.guesstime, trackName);
                                songsdb.hmset(`${userStats.nickname}:${room}:${trackName}`, 'shortcut', `${guess.artist} - ${guess.title}`, 'guessedTime', userStats.guesstime);
                            }
                        })
                    });
                }
            });
        }

    }
}

exports.userTrackRank = async function (room, nickname, cb) {
    userdb.zrange([`${nickname}:${room}`, 0, 2000, 'withscores'], (err, tracks) => {
        let guessesKey = [];
        for (let i = 0; i < tracks.length; i=i+2){
            guessesKey.push(`${nickname}:${room}:${tracks[i]}`);
        }
        MHGETALL_USER_GUESS(tracks, guessesKey, cb);
    })
}

function MHGETALL_USER_GUESS(tracks, keys, cb) {

    const multi = songsdb.multi({ pipeline: false });

    keys.forEach(function (key, index) {
        multi.hmget([key, 'shortcut', 'guessedTime']);
    });

    multi.exec(function (err, result) {
        cb(err, result);
    });
}

exports.trackRank = async function (room, cb) {

    songsdb.zrange([room, 0, 2000], (err, tracks) => {

        let tracksId = [];
        tracks.forEach(function (key) {
            tracksId.push('song:' + key);
        })
        MHGETALL(room, tracksId, cb);
    })
}

function MHGETALL(room, keys, cb) {

    const multi = songsdb.multi({ pipeline: false });

    keys.forEach(function (key, index) {
        multi.hmget([key, 'trackName', `bestScore:${room}`, `userBestScore:${room}`]);
    });

    multi.exec(function (err, result) {
        cb(err, result);
    });
}


