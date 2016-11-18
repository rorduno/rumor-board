var Hapi = require('hapi');
var moment = require('moment');
var server = new Hapi.Server();
server.connection({ port: 8080 });

var redis = require('redis');
var redisClient = redis.createClient();
var io = require('socket.io')(server.listener);
var rumors = [];

server.register(require('inert'), (err) => {

    if (err) {
        throw err;
    }

    // The server.route() command registers the /hello route, which tells your server
    // to accept GET requests to /hello and reply with the contents of the hello.html file.
	server.route([ {
            method: 'GET',
	        path: '/',
	        handler: { file: "index.html" },
	        config: {
                state: {
                    parse: false, // parse and store in request.state
                    failAction: 'ignore' // may also be 'ignore' or 'log'
                }
            }
    }, {
        method: 'GET', // switch these two routes for a /static handler?
        path: '/client.js',
        handler: { file: './client.js' },
        config: {
            state: {
                parse: false, // parse and store in request.state
                failAction: 'ignore' // may also be 'ignore' or 'log'
            }
        }
    }]);

    // when server starts
    server.start(() => {
        console.info(`Server started at ${ server.info.uri }`);
    })
});


// set listener for 'connection'
io.on('connection', function(socket){
    console.log('a user connected');

    // loads persisted rumors back to client
    socket.on('io:load-rumors', function () {
        redisClient.lrange('rumors', 0, -1, function(err, data){
            console.log('data is ' + data.length);
            rumors = data.reverse(); // reverse messages
            rumors.forEach(function(rumor){
                rumor = JSON.parse(rumor); // deserialize
                socket.emit('io:text', rumor.data);
            });
        });

    });

    // listener for text input from client
    socket.on('io:text', function (text) {
        console.log('io:text server side');

        var now =  moment().toString();
        // persist data in database
        storeRumor( now, text);
        // emit back to client side
        io.emit('io:text', text);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

});

var storeRumor = function (timestamp, data) {
    // create object and turn to string  to store in redis, serialize
    var rumor = JSON.stringify( {timestamp: timestamp, data: data} );

    redisClient.lpush('rumors', rumor, function(err, response){
        console.log('adding rumor to redis ' + rumor);
    });
}

