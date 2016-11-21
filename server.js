var Hapi = require('hapi');
var server = new Hapi.Server();
server.connection({ port: 3333 });

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
        method: 'GET', /
        path: '/client.js',
        handler: { file: './client.js' },
        config: {
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
            var newData = { rumor: data, index: key };

            redisClient.set(key, data);
            redisClient.sadd('rumors', key);
            socket.emit('io:text', newData); // emit back to client side
            console.log('adding rumor to redis ' + data + ' and index : ' + key);

        });

    }

    var editRumor = function (newData) {
        console.log('editing newData...' + newData.index + newData.rumor);
        redisClient.set(newData.index, newData.rumor);
    }

    var removeRumor = function (index) {
       console.log('deleting...' + index);
        // delete data from set
        redisClient.del(index);
        // delete id from 'rumors'
        redisClient.srem('rumors', index);
    }

});

