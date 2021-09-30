const songsdb = require('./redis-clients').songs;
const userdb = require('./redis-clients').users;
const allRooms = require('../config.json').rooms;

exports.trackStats = function (userStats, trackId) {
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
                    userdb.zscore([`${userStats.nickname}:tracks`, trackName], (err, userTrackGuessTime) => {
                        // add if the song id is not set yet
                        if (!userTrackGuessTime) {
                            userdb.zadd(`${userStats.nickname}:tracks`, userStats.guesstime, trackName);
                        }
                        // if the id song exists in set, check if current user guess time is lower than before
                        else if (userStats.guesstime < userTrackGuessTime) {
                            userdb.zadd(`${userStats.nickname}:tracks`, userStats.guesstime, trackName);
                        }
                    })
                });
            }
        });
    }

}

exports.userTrackRank = async function (nickname, cb) {
    userdb.zrange([`${nickname}:tracks`, 0, 30, 'withscores'], (err, tracks) => {
        cb(err, tracks);
    })
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


