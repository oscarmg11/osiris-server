if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const helmet = require('helmet');


require('./src/db/db');
require('./src/schedules')

const PORT = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(helmet());
app.use(require('./src/routes/routes'))

const server = require('http').createServer(app)

const io = require('socket.io').listen(server); 
require('./src/sockets/socket')(io)

server.listen(PORT, () => {
    console.log(`server on port ${PORT}`)
}) 