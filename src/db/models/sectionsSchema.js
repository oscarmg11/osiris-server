const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const sections = Schema({
    sectionName: {
        type: String,
        unique: true
    },
    coordinates: [{ 
        latitude: Number,
        longitude: Number
    }],
    employees: [{
        idEmployee: String
    }],
    owner: String,
    plants: String,
    finishRead: Boolean,
    temperature: {
        type: Number,
        default: 0
    },
    lastPeriod: {
        width: Number,
        height: Number,
        numberFruits: Number,
        withPlague: Number,
        withoutPlague: Number
    },
    checkDateFrom : String,
    checkDateTo: String    
})

module.exports = mongoose.model('sections', sections);