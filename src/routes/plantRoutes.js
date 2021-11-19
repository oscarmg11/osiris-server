const express = require('express');
const multer = require('multer');

const router = express.Router()
const inMemoryStorage = multer.memoryStorage()
const upload = multer({ storage: inMemoryStorage })

const {
    getPlant,
    getPLantsReported,
    getSpecificPlant,
    getPlantBySection,
    updatePlant,
    deleteReport,
    reportPlant,
    updatePlants
} = require('../routes-handler/plant');

router.get('/reports', getPLantsReported) 
router.get('/specific', getSpecificPlant)
router.get('/section', getPlantBySection)

router.post('/report',upload.array('reports', 3), reportPlant )

router.put('/', updatePlant)
router.put('/update', updatePlants)
router.put('/get', getPlant)

router.delete('/deleteReport', deleteReport)


module.exports = router 