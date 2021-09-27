const http = require ('http');
const JSONStream = require ('JSONStream');
const parse = JSONStream.parse(['results', 'true']);
const trackId = 1465977741;

parse.on('data', function (track){
console.log ('fui chamado aqui');
if(track.wrapperType == 'artist'){
console.log (track.artistId);
}
})

const options = {
headers: {'content-type': 'application/json'},
host: 'itunes.apple.com',
path: '/lookup?id=' + trackId, 
port: 80
}
http.get(options, (res) =>{res.pipe(parse);})
