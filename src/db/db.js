const mongoose = require('mongoose');

const plantCollection = require('./models/plantSchema')
const userCollection = require('./models/userSchema')
const sectionCollection = require('./models/sectionsSchema')

mongoose.connect(process.env.DB, {
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    useFindAndModify: false,
    useCreateIndex: true})
    .then(async (db) => {
        console.log('DB CONNECTED')               
    }) 
    .catch((err) => {console.log(err)}) 