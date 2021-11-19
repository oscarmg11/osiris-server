const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const buySchema = Schema({
    name: String,
    weight: Number,
    total: Number,
    document: String,
    section: String,
    date: String
})

module.exports = mongoose.model('Buys', buySchema);