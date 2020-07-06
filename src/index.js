const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const { getuid } = require('process')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicPath = path.join(__dirname, '../public')

app.use(express.json())
app.use(express.static(publicPath))

io.on('connection', (socket) => { // client connect to server
    console.log('new websocket connection')

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!')) // server send to particular client welcome message
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`)) //  server send message to everybody but that particular client

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => { // custom event receiving data from client
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!') // check if there are bad words in the message and if yes, then stop the execution flow and call the acknowlegement
        }

        io.to(user.room).emit('message', generateMessage(user.username, message)) // server send message to anyone that is connected
        callback() // basic acknowledgement
    })

    socket.on('sendLocation', (location, callback) => { // custom event receiving position from client
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.de/maps?q=${location.latitude},${location.longitude}`))
        callback() // invoke function on client
    })

    socket.on('disconnect', () => { // client disconnect
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })
})

server.listen(port, () => {
    console.log(`Server listen on port ${port}`)
})