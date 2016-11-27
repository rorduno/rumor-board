var Hapi = require('hapi');
var server = new Hapi.Server();
var port = process.env.PORT || 3333;
server.connection({ port: port });

var redis = require('redis');
var redisClient;
var io = require('socket.io')(server.listener);
var sanitizer = require('sanitizer');


if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    redisClient = require("redis").createClient(rtg.port, rtg.hostname);

    redisClient.auth(rtg.auth.split(":")[1]);
} else {
    var redisClient = require("redis").createClient();
}

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
        method: 'GET',
        path: '/client.js',
        handler: { file: './client.js' },
        config: {
            state: {
                parse: false, // parse and store in request.state
                failAction: 'ignore' // may also be 'ignore' or 'log'
            }
        }
    }, {
        method: 'GET',
        path: '/favicon.ico',
        handler: {
            file: 'favicon.ico'
        }, config: {
                state: {
                    parse: false, // parse and store in request.state
                    failAction: 'ignore' // may also be 'ignore' or 'log'
                }
        }
       }]);

    server.start(() => {
        console.info(`Server started at ${ server.info.uri }`);
    })
});

// set listener for 'connection', all socket io is done here
io.on('connection', function(socket){
    console.log('a user connected') ;
    // loads persisted rumors back to client
    socket.on('io:load-rumors', function () {
        console.log('io:load-rumors');
        // loop through 'rumors' and get ids
        redisClient.smembers('rumors', function(err,data){
            var rumorIds = data;
            // then get each set by its id
            rumorIds.forEach(function(rumorId){
            // emit data to client
                redisClient.get(rumorId, function(err, data){
                    var dataToReturn = { rumor: data, index: rumorId };
                    socket.emit('io:text', dataToReturn);
                })
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

    // listener for editing rumor
    socket.on('io:edit-rumor', function (newData) {
        console.log('io:edit-rumor server side');
        editRumor(newData);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    var storeRumor = function (data) {
    // increment counter
        redisClient.incr('id:rumors', function(err, response){
            // INCR id:rumors
            // SET rumors:{id} 'data'
            // SADD rumors {id}
            var key = 'rumors-' + response; // set key as rumor:1
            var cleanData = sanitizer.escape(data); // Escapes HTML special characters in attribute values as HTML entities
            var newData = { rumor: cleanData, index: key };

            redisClient.set(key, cleanData);
            redisClient.sadd('rumors', key);
            socket.emit('io:text', newData); // emit back to client side
            console.log('adding rumor to redis ' + cleanData + ' and index : ' + key);

        });

    }

    var editRumor = function (newData) {
        var cleanData = sanitizer.escape(newData.rumor); // Escapes HTML special characters in attribute values as HTML entities
        console.log('editing newData...' + newData.index + cleanData);

        redisClient.set(newData.index, cleanData);
    }

    var removeRumor = function (index) {
       console.log('deleting...' + index);
        // delete data from set
        redisClient.del(index);
        // delete id from 'rumors'
        redisClient.srem('rumors', index);
    }

});

