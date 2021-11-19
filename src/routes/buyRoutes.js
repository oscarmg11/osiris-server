const express = require('express');
const multer = require('multer');

const inMemoryStorage = multer.memoryStorage()
const upload = multer({ storage: inMemoryStorage })

const router = express.Router()

const {
    postBuy,
    getBuys,
    deleteBuy
} = require('../routes-handler/buy')

router.get('/', getBuys)

router.post('/', upload.array('buy', 2), postBuy)

router.delete('/:id', deleteBuy)

module.exports = router