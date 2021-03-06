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
      renderMessage(data);
    });

    $('#form-add').submit(function() {

        //if input is empty or white space do not send message
        if($('#m').val().match(/^[\s]*$/) !== null) {
          $('#m').val('');
          $('#m').attr('placeholder', 'enter text here');
          return false;
        }

        var msg  = $('#m').val();
        // client to server, emits text input back to server
        socket.emit('io:text', msg);
        $('#m').val(''); // clear message form ready for next/new message
        $('#m').attr('placeholder', ''); //clears placeholder once a msg is successfully sent

        return false;
    });

    $("#modal-edit").on("show.bs.modal", function(e) {
        document.getElementById('n').value = e.relatedTarget.dataset.rumor;
        document.getElementById('n').dataset.index = e.relatedTarget.dataset.index
    });

    $("#modal-delete").on("show.bs.modal", function(e) {
        document.getElementById('modal-delete-submit').dataset.index = e.relatedTarget.dataset.index
    });

    $('#form-edit').submit(function(e) {
        e.preventDefault();

        //if input is empty or white space do not send message
        if($('#n').val().match(/^[\s]*$/) !== null) {
          $('#n').val('');
          $('#n').attr('placeholder', 'enter text here');
          return false;
        }

        var msg  = $('#n').val();
        var newData = document.getElementById('n').value;
        var index = document.getElementById('n').dataset.index;
        socket.emit('io:edit-rumor' , { index: index, rumor: newData });

        // update ui
        $('#' + index + ' p').text(newData);

        $('#n').val(''); // clear message form ready for next/new message
        $('#n').attr('placeholder', ''); //clears placeholder once a msg is successfully sent
        $('#modal-edit').modal('hide');
        return false;
    });

    $('#form-delete').submit(function(e) {
        e.preventDefault();
        // delete rumors
        var index = document.getElementById('modal-delete-submit').dataset.index;
        socket.emit('io:delete-rumor', index);

        // update ui
        $('#' + index).remove();
        $('#modal-delete').modal('hide');
        return false;
    });

  /**
   * renders messages to the DOM
   * nothing fancy
   */
    function renderMessage(newData) {
        var data = removeTags(newData.rumor);
        var html = "<li class='row' id='" + newData.index+ "'>";
        html += "<blockquote><p>" + data + "</p></blockquote>";
        html += "<div class='text-right'>";
        html += "<button class='fa fa-pencil-square-o fa-2x' aria-hidden='true' data-index='" + newData.index + "' data-rumor='" + data + "' data-toggle='modal' data-target='#modal-edit'></button>";
        html += "<button class='fa fa-trash fa-2x' aria-hidden='true' data-index='" + newData.index + "' data-rumor='" + data + "' data-toggle='modal' data-target='#modal-delete'></button>";
        html += "</div>";
        html += "</li>";
        $('#rumors').append(html);  // append to list
    return;
  }

    var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';

    var tagOrComment = new RegExp(
        '<(?:'
        // Comment body.
        + '!--(?:(?:-*[^->])*--+|-?)'
        // Special "raw text" elements whose content should be elided.
        + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
        + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
        // Regular name
        + '|/?[a-z]'
        + tagBody
        + ')>',
        'gi');

    function removeTags(html) {
      var oldHtml;
      do {
        oldHtml = html;
        html = html.replace(tagOrComment, '');
      } while (html !== oldHtml);
      return html.replace(/</g, '&lt;');
    }
});
