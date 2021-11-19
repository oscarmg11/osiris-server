const express = require('express');

const router = express.Router()

const {
    getSections,
    getInfoSection,
    updateSection,
    deleteSection,
    createSection
} = require('../routes-handler/section')

router.get('/', getSections)
router.get('/info', getInfoSection)

router.post('/', createSection)

router.post('/update/:id', updateSection)

router.delete('/:id', deleteSection)

module.exports = router