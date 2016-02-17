var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var port = process.env.PORT || 5000

var count = 0;
var users = {}

app.get('/', function(req, res){
  console.log('sending out index.html')
  res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket){
  var values = Object.keys(users).map(function(key){
    return users[key];
  });
  var id = count++;
  var name = "User " + id
  socket.emit('user_list', values)
  users[socket.id] = { name:name, id:id }
  console.log('a user connected: ' + name)
  socket.broadcast.emit('user_add', users[socket.id])
  socket.emit('connection', users[socket.id])

  socket.on('disconnect', function(){
    console.log('user disconnected')
    io.emit('user_remove', users[socket.id])
    delete users[socket.id]
  })

  socket.on('chat_message', function(msg){
    console.log('emit message: ' + msg)
    var user = users[socket.id]
    io.emit('chat_message', { name:user.name, id:user.id, msg:msg })
  })

  socket.on('name_change', function(msg){
    var oldName = users[socket.id].name
    users[socket.id].name = msg
    console.log('emit message: ' + msg)
    io.emit('name_change', users[socket.id])
  })

  socket.on('is_typing', function(){
      socket.broadcast.emit('is_typing', users[socket.id]);
  })
})

http.listen(port, function(){
  console.log('listening on ' + port)
})
