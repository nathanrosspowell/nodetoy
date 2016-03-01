"use strict";
$(function(){
    // Chat functions.
    function stopTyping(id) {
        delete isTyping[id]
        $('#typer'+id).remove()
    }

    function addChat(data){
        addToLogAndScroll(data.id, data.msg, "", undefined)
    }

    function addUpdate(message){
        addToLogAndScroll( 0, message, "list-group-item update")
    }

    function addToLogAndScroll(userId, message, classType, img){
        var user = users[userId]
        var userName = user.name
        var isLocal = (userName === localUser.name)
        var avatarDiv = 'avatar'
        var speechDiv = 'speech'
        var triangleType = 'left'
        if (isLocal) {
            avatarDiv += '-local'
            speechDiv += '-local'
            triangleType = 'right'
        }
        var out = document.getElementById("chat-scroll")
        var isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 1
        var lastMessage = $( "#messages > section:last-child > div > div." + avatarDiv + " > img")
        var appendToPrev = (lastMessage.length && lastMessage.attr("alt") === userName)
        var panel = null;
        var panelBody = null;
        if (appendToPrev) {
            panelBody = $( "#messages > section:last-child > div > div." + speechDiv + " > div" )
        }
        else {
            panel = $('<div>')
            if (isLocal) {
                panel.addClass("text-right")
            }
            var heading = $('<div>').addClass(avatarDiv)
            var avatar = $('<img>')
                .addClass("center-cropped img-circle")
                .attr('src',users[userId].avatar)
                .attr('alt',userName)
                .attr('title',userName)
            heading.append(avatar)
            panelBody = $('<div>').addClass("triangle-isosceles " + triangleType)
            var speech = $('<div>').addClass(speechDiv).append(panelBody)
            if (isLocal) {
                panel.append(speech)
                panel.append(heading)
            }
            else {
                panel.append(heading)
                panel.append(speech)
            }
            $('#messages').append($('<section>').addClass('message').append(panel))
        }
        if (typeof img !== "undefined") {
            panelBody.append($('<img>').attr("src", img.src))
        }
        else {
            panelBody.append($('<p>').addClass("slim").text(message))
        }
        //$('#messages').append($('<section>').append($('<div>').addClass('avatar').text("hello")).append($('<div>').addClass('speech').text('world')))

        setTimeout(function() {
            if(isScrolledToBottom) {
                out.scrollTop = out.scrollHeight - out.clientHeight
            }
        }, 1);
    }

    // Canvas functions.
    function canvasBlob(user, blob) {
        socket.emit("blob", blob)
        var newImg = document.createElement("img"),
            url = URL.createObjectURL(blob)
        newImg.onload = function() {
            // no longer need to read the blob so it's revoked
            URL.revokeObjectURL(url)
        };
        newImg.src = url
        placeChatImg(user, newImg)
    }

    function recieveBlob(user, blob) {
        var uint8Arr = new Uint8Array(blob)
        var binary = ''
        for (var i = 0; i < uint8Arr.length; i++) {
            binary += String.fromCharCode(uint8Arr[i])
        }
        var base64String = window.btoa(binary)
        var img = new Image()
        img.onload = function() {
            placeChatImg(user, this)
        }
        img.src = 'data:image/png;base64,' + base64String
    }

    function placeChatImg(user, img) {
        addToLogAndScroll(user.id, user.name, "", img)
    }

    // Painting functions
    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect()
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    }

    function onPaint() {
        context.lineTo(mouse.x, mouse.y);
        context.stroke();
    };

    function clearCanvas(){
        var canvas = document.getElementById('myCanvas')
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isBlank = true;
        return false
    }

    // Chat globals.
    var isTyping = {}
    var localUser = {}
    var users = {}
    users[0] = {
        name: "Admin",
        id: 0,
        avatar: "http://i.imgur.com/gu4kfeL.jpg"
    }

    // Connection.
    var socket = io()

    // Form functionality.
    $('#m').on('input', function() {
        socket.emit('is_typing')
    })

    $('#fm').submit(function(){
        var msg = $('#m').val()
        if (msg && msg.length > 0) {
            socket.emit('chat', msg)
            addChat(jQuery.extend({msg:msg}, localUser))
            $('#m').val('')
        }
        return false
    })

    $('#fn').submit(function(){
        var input = $('#n')
        var name = input.val()
        if (name && name.length > 0) {
            localUser.name = name
            socket.emit('name_change', name)
            input.attr('placeholder', name)
            input.val('')
            addUpdate('You changed your name to  "' + name + '"')

        }
        return false
    })

    $('#an').submit(function(){
        var input = $('#a')
        var avatar = input.val()
        if (avatar && avatar.length > 0) {
            localUser.avatar = avatar
            socket.emit('avatar_change', avatar)
            input.attr('placeholder', avatar)
            input.val('')
            addUpdate('You changed your avatar to  "' + avatar + '"')
        }
        return false
    })

    $('#clearCanvas').click(clearCanvas);

    $('#cm').submit(function(){
        if (isBlank){
            return false;
        }
        var canvas = document.getElementById('myCanvas');
        if (typeof canvas.toBlob !== "undefined") {
          canvas.toBlob(function(blob) {
              canvasBlob(localUser, blob);
          }, "image/png", 0.75);
        }
        else if (typeof canvas.msToBlob !== "undefined") {
          var blob = canvas.msToBlob()
          canvasBlob(localUser, blob)
        }
        clearCanvas();
        return false
    })

    // Message handlers.
    socket.on('is_typing', function(user){
        if (user.id in isTyping){
            clearTimeout(isTyping[user.id])
        }
        else {
            $('#typers').append($('<li>').attr('id', 'typer'+user.id).text(user.name + "..."))
        }
        isTyping[user.id] = setTimeout(stopTyping, 2000, user.id, user.name)
    })

    socket.on('connection', function(user){
        localUser = user
        $('#n').attr('placeholder', user.name)
        $('#a').attr('placeholder', user.avatar)
        addUpdate('Welcome, "' + user.name + '"!')
        users[user.id] = user
    })

    socket.on('chat', function(data){
        addChat(data)
        stopTyping(data.id)
    })

    socket.on('user_list', function(list){
        for (var i = 0; i < list.length; i++) { 
            var user = list[i]
            $('#users').append($('<li>').attr('id', 'user'+user.id).text(user.name))
            users[user.id] = user
        }
    })

    socket.on('user_add', function(user){
        $('#users').append($('<li>').attr('id', 'user'+user.id).text(user.name))
        addUpdate('"' + user.name + '" joined.')
        users[user.id] = user
    })

    socket.on('user_remove', function(user){
        $('#user'+user.id).remove()
        addUpdate('"' + user.name + '" left.')
        delete users[user.id]
    })

    socket.on('name_change', function(user){
        var oldName = "server_error"
        var userList = $('#user'+user.id)
        oldName = userList.text()
        userList.text(user.name)
        addUpdate('"' + oldName + '" changed name to  "' + user.name + '"')
        if (user.id in isTyping){
            $('#typer'+user.id).text(user.name+"...")
        }
        users[user.id].name = user.name
    })

    socket.on('avatar_change', function(user){
        var oldAvatar = "server_error"
        var userList = $('#user'+user.id)
        oldAvatar = userList.text()
        userList.text(user.avatar)
        users[user.id].avatar = user.avatar
    })

    socket.on('blob', function(data){
        recieveBlob(data.user, data.blob)
    })

    // Painting globals
    var canvas = document.getElementById('myCanvas')
    var mouse = {x: 0, y: 0}
    var context = canvas.getContext('2d')
    var isBlank = true;

    canvas.addEventListener('mousemove', function(e) {
        mouse = getMousePos(canvas, e)
    }, false)

    canvas.addEventListener('mousedown', function(e) {
        mouse = getMousePos(canvas, e)
        context.beginPath()
        context.moveTo(mouse.x, mouse.y)
        canvas.addEventListener('mousemove', onPaint, false)
        isBlank = false;
    }, false)

    canvas.addEventListener('mouseup', function() {
        canvas.removeEventListener('mousemove', onPaint, false)
    }, false)
})
