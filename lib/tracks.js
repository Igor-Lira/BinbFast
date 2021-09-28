const songsdb = require('./redis-clients').songs;
const userdb = require('./redis-clients').users;

exports.trackStats = function (userStats, trackId) {
    songsdb.hmget(
        [
            'song:' + trackId,
            'bestScore',
            'trackName'
        ], function (err, replies) {
            if (err) {
                throw err;
            }
            const [bestScore, trackName] = replies;
            if (userStats.guesstime && userStats.guesstime < bestScore) {
                songsdb.hmset('song:' + trackId, 'userBestScore', userStats.nickname, 'bestScore', userStats.guesstime);
                songsdb.zadd ('sub', userStats.guesstime,  trackId);
            }

            const result = userdb.zscore([`${userStats.nickname}:tracks`, trackId], (err, userTrackGuessTime) => {
                // add if the song id is not set yet
                if (!userTrackGuessTime){
                    userdb.zadd (`${userStats.nickname}:tracks`, userStats.guesstime, trackName);
                }
                // if the id song exists in set, check if current user guess time is lower than before
                else if (userStats.guesstime < userTrackGuessTime) {
                    userdb.zadd (`${userStats.nickname}:tracks`, userStats.guesstime, trackName);
                }
            })
        })
}

exports.userTrackRank = async function (nickname, cb){
    userdb.zrange ([`${nickname}:tracks`, 0, 30, 'withscores'], (err, tracks) => {
        console.log (tracks);
        cb(err, tracks);
    })  
}
exports.trackRank = async function (cb){
    
     songsdb.zrange(['sub', 0, 30],  (err, tracks) => {
        
        let tracksId = [];
        tracks.forEach(function (key){
            tracksId.push ('song:'+ key); 
        })  
        MHGETALL(tracksId, cb);
    })    
}

function MHGETALL(keys, cb) {
    
    const multi = songsdb.multi({pipeline: false});

    keys.forEach(function(key, index){
        multi.hmget([key, 'trackName',  'bestScore', 'userBestScore']);
    });

    multi.exec(function(err, result){
        cb(err, result);
    });
}


