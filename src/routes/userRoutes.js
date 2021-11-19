const express = require('express');
const multer = require('multer');

const inMemoryStorage = multer.memoryStorage()
const upload = multer({ storage: inMemoryStorage })

const tokenValidation = require('../tokenValidation');

const router = express.Router()

const {
    getUsers,
    login,
    updateUserwPhoto,
    createUser,
    updatewoPhoto,
    completeTodo,
    createNewTodo,
    deleteUser,
    deleteTodo,
    finisReading,
    createNewTodowMedia,
    getTemperature,
    sendAudio,
    updatePassword
} = require('../routes-handler/user')

router.get('/', tokenValidation, getUsers)
router.get('/temperature', tokenValidation, getTemperature)

router.post('/login', login)
router.post('/create', tokenValidation, upload.single('photo'), createUser)
router.post('/newTask', tokenValidation, createNewTodo)
router.post('/newTaskwMedia', tokenValidation, upload.array('todo', 4), createNewTodowMedia)
router.post('/audio', tokenValidation, upload.single('audio'), sendAudio)

router.put('/updatewphoto', tokenValidation, upload.single('photo'), updateUserwPhoto)
router.put('/update', tokenValidation, updatewoPhoto)
router.put('/password', tokenValidation, updatePassword)
router.put('/completeTodo', tokenValidation, completeTodo)
router.put('/finishReading', tokenValidation, finisReading)

router.delete('/delete', tokenValidation, deleteUser)
router.delete('/deleteTodo', tokenValidation, deleteTodo)

module.exports = router