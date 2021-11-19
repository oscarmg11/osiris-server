const mongoose = require('mongoose');
const bcrypt = require('bcrypt')

const Schema = mongoose.Schema;

const userSchema = Schema({
    rol: {
        type: String,
        enum: [
            'admin',
            'manager',
            'owner',
            'employee'
        ]
    },
    userName: {
        type: String,
        unique: true
    },
    password: String,
    todos: [{
        title: String,
        todo: String,
        status: Boolean,
        imgs: [{
            uri: String
        }]
    }],
    reads: [{
        lat: Number,
        lng: Number
    }],
    readToday: Boolean,
    name: String,
    nPlants: String,
    plants: Array,
    plantsToDisplay: String,
    missingPlants: String,
    section: String,
    meanReads: Number,
    photo: String,
    address: String
})

userSchema.methods.generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}

userSchema.methods.validPassword = function(password){
    return bcrypt.compareSync(password, this.password);
}

module.exports = mongoose.model('Users', userSchema);