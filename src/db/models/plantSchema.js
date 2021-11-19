const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const plantSchema = Schema({
    name: String,
    numberFruits: Number,
    width: Number,
    height: Number,
    provider: String,
    type: String,
    dateBuy: String,
    serialNumber: String,
    statusReported: Boolean,
    section: String,
    report: {
        user: String,
        date: String,
        description: String
    },
    lastUpdate: String,
    imagesReport: [{
        uri: String
    }],
    plantedDate: String,
    owned: Boolean,
    owner : String
})

module.exports = mongoose.model('Plants', plantSchema);