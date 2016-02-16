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
  var id = count++;
  var name = "User " + id
  users[socket.id] = { name:name, id:id }
  console.log('a user connected: ' + name)
  var values = Object.keys(users).map(function(key){
    return users[key];
  });
  socket.broadcast.emit('chat_message', 'User "' + name + '" joined')
  socket.broadcast.emit('user_add', users[socket.id])
  socket.emit('chat_message', 'Welcome, ' + name + '!')
  socket.emit('user_list', values)


  socket.on('disconnect', function(){
    console.log('user disconnected')
    io.emit('chat_message', 'User "'+ users[socket.id] + '" left.')
    delete users[socket.id]
  })

  socket.on('chat_message', function(msg){
    console.log('emit message: ' + msg)
    io.emit('chat_message', users[socket.id].name + ': ' + msg)
    socket.broadcast.emit('user_remove', users[socket.id])
  })

  socket.on('name_change', function(msg){
    var oldName = users[socket.id].name
    users[socket.id].name = msg
    console.log('emit message: ' + msg)
    io.emit('chat_message', '"' + oldName + '" changed name to  "' + msg + '"')
  })
})

http.listen(port, function(){
  console.log('listening on ' + port)
})
