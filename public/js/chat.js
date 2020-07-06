// connect to the server by calling the io-client function available in the other script of /socket.io/socket.io.js
const socket = io();

// Elements
const $messageForm = document.querySelector('#messageForm')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#sendLocation')
const $messages = document.querySelector('#messages')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

const autoscroll = () => {
    // new message element
    const $newMessage = $messages.lastElementChild

    // height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    const visibleHeight = $messages.offsetHeight

    // height of messages container
    const containerHeight = $messages.scrollHeight

    // how far have i scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

socket.on('locationMessage', (message) => {
    console.log(message)
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('HH:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })

    document.querySelector('#sidebar').innerHTML = html
})

socket.on('message', (message) => { // client listen on data from server
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()

})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault(); // dont refresh the page

    // disable form
    $messageFormButton.setAttribute('disabled', 'disabled')

    const message = e.target.elements.message.value
    socket.emit('sendMessage', message, (error) => {
        // enable form
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error) {
            return console.log(error)
        }

        console.log('Message delivered!')
    })
});

$sendLocationButton.addEventListener('click', (e) => {
    // does the browser support geolocation?
    if (!navigator.geolocation) {
        return alert('Your browser does not support geolocation')
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')

    // setup sucesscallback and when data is retrieved, send that to the server
    navigator.geolocation.getCurrentPosition((position) => {

        socket.emit('sendLocation', { latitude: position.coords.latitude, longitude: position.coords.longitude }, (error) => {
            $sendLocationButton.removeAttribute('disabled')
            console.log('location shared!')
        }) // client send data to server
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = "/"
    }
})