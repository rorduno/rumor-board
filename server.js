var Hapi = require('hapi');
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
    console.log('a user connected') ;

    // loads persisted rumors back to client
    socket.on('io:load-rumors', function () {
        redisClient.lrange('rumors', 0, -1, function(err, data){
            console.log('data is ' + data.length);
            rumors = data.reverse(); // reverse messages
            rumors.forEach(function(rumor, index){
                data = { rumor: rumor, index: index };
                console.log('data is ' + rumor);
                console.log('index is ' + index);
                socket.emit('io:text', data);
            });
        });

    });

    // listener for text input from client
    socket.on('io:text', function (text) {
        console.log('io:text server side');
        // persist data in database
        storeRumor(text);
    });

    // listener for deleting rumor
    socket.on('io:delete-rumor', function (index) {
        console.log('io:delete-rumor server side');
        removeRumor(index);

    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

});

var storeRumor = function (data) {
    var rumor = data;
    redisClient.lpush('rumors', rumor, function(err, response){
        var index = response - 1;
        console.log('adding rumor to redis ' + rumor + ' and index : ' + index);
        var data = { rumor: rumor, index: index };
        // emit back to client side
        io.emit('io:text', data);
    });
}

var editRumor = function (index, newData) {
    redisClient.lset('rumors', index, newData);

    // update socket
    io.emit('io:load-rumors');
}

var removeRumor = function (index) {
    // use LSET to change the value of the element to 'DELETE', and the you call LREM on this value.
    console.log('deleting...' + index);
    redisClient.lset('rumors', index, 'DELETE');
    redisClient.lrem('rumors', 1, 'DELETE');

    // update socket
    io.emit('io:load-rumors');
}