const songsdb = require('./redis-clients').songs;


exports.trackStats = function (userStats, trackId) {
    songsdb.hmget(
        [
            'song:' + trackId,
            'bestScore',
        ], function (err, replies) {
            if (err) {
                throw err;
            }
            const [bestScore] = replies;
            if (userStats.guesstime && userStats.guesstime < bestScore) {
                songsdb.hmset('song:' + trackId, 'userBestScore', userStats.nickname, 'bestScore', userStats.guesstime);
                songsdb.zadd ('sub', userStats.guesstime,  trackId);
            }
        })
        /*
        songsdb.zrange(['igor', 0, 10], function(err, tracks){
            console.log ("|============RANK===========|")
            for (let i = 0; i < tracks.length; i++){
                console.log (tracks[i]);
                 songsdb.hmget ([tracks[i], 'trackName',  'bestScore', 'userBestScore'], (err, replies)=>{
                     const inSec = replies[1]/1000;
                     console.log (`${i}: ${replies[0]} - ${inSec}`)
                 })
            }
        });
        */
}

exports.trackRank = async function (cb){
    
     songsdb.zrange(['sub', 0, 30],  (err, tracks) => {
        
        const tracksId = [];
        tracks.forEach(function (key){
            tracksId.push ('song:'+ key); 
        })
        console.log ('tracksId', tracksId);
        
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


