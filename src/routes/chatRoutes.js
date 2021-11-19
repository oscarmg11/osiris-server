const express = require('express');

const router = express.Router()

const {
    getChats
} = require('../routes-handler/chat')

router.get('/', getChats)

module.exports = router