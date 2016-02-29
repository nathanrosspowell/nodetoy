var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var port = process.env.PORT || 5000

var count = 0;
var users = {}

app.get('/', function(req, res){
  console.log('[app.get /] sending out index.html')
  res.sendfile(__dirname + '/index.html')
})

app.get('/js/client.js', function(req, res){
    res.sendFile(__dirname + '/js/client.js')
})

io.on('connection', function(socket){
  var values = Object.keys(users).map(function(key){
    return users[key];
  });
  var id = count++;
  var name = "User " + id
  socket.emit('user_list', values)
  users[socket.id] = { name:name, id:id }
  socket.broadcast.emit('user_add', users[socket.id])
  console.log('[connection]', name, id, socket.id)
  socket.emit('connection', users[socket.id])

  socket.on('disconnect', function(){
    var user = users[socket.id]
    console.log('[disconnect]', user.name, user.id)
    io.emit('user_remove', user);
    delete users[socket.id]
  })

  socket.on('chat', function(msg){
    var user = users[socket.id]
    console.log('[chat]', user.name, user.id, msg)
    socket.broadcast.emit('chat', { name:user.name, id:user.id, msg:msg })
  })

  socket.on('name_change', function(msg){
    var oldName = users[socket.id].name
    users[socket.id].name = msg
    var user = users[socket.id]
    console.log('[name_change]', oldName, user.name, user.id, msg)
    socket.broadcast.emit('name_change', user)
  })

  socket.on('is_typing', function(){
    var user = users[socket.id]
    socket.broadcast.emit('is_typing', user)
  })

  socket.on('blob', function(blob){
    var user = users[socket.id]
    socket.broadcast.emit('blob', { user:user, blob:blob})
  })
})

http.listen(port, function(){
  console.log('listening on ' + port)
})
