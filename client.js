$( document ).ready(function() {
    var socket = io(); // init socket.io connection

    // server to client listens for 'connection' event
    socket.on('connection', function(){
        console.log('connection in client side');
    });

    // load rumors
    socket.emit('io:load-rumors');

    // listens for text i/o
    socket.on('io:text', function(data){
      console.log('connection in client side' + data);
      renderMessage(data);
    });

    $('form').submit(function() {

        //if input is empty or white space do not send message
        if($('#m').val().match(/^[\s]*$/) !== null) {
          $('#m').val('');
          $('#m').attr('placeholder', 'enter text here');
          return false;
        }

        var msg  = $('#m').val();
        console.log('submitting text : ' + msg);
        // client to server, emits text input back to server
        socket.emit('io:text', msg);
        $('#m').val(''); // clear message form ready for next/new message
        $('#m').attr('placeholder', ''); //clears placeholder once a msg is successfully sent

        return false;
    });

  /**
   * renders messages to the DOM
   * nothing fancy
   */
    function renderMessage(rumor) {
        var html = "<li class='row'>";
        html += "<blockquote class=''><p>" + rumor + "</p></blockquote>";
        html += "</li>";
        html += "<div class='text-right'><i class='fa fa-pencil-square-o fa-2x' aria-hidden='true'></i> <i class='fa fa-trash fa-2x' aria-hidden='true'></i></div>";
        $('#rumors').append(html);  // append to list
    return;
  }
});
