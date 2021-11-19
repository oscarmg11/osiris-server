
const userCollection = require('../db/models/userSchema')

const newTodo = (data, users, io) => {    
    const { todo, usersTodo } = data
    for( let i = 0; i < usersTodo.length; i++){
        let index = users.findIndex( user => user.userName === usersTodo[i].userName )
        console.log(index)
        if(index >= 0){ 
            io.to(`${users[index].socketId}`).emit('newTodo', { todo }) 
        }
    }
    
}

const alertPosition = async (data, users, io) => {
    let admin = await userCollection.findOne({ 'rol': 'admin' })
    let index = users.findIndex( user => user.userName === admin.userName )
    if(index >= 0){ 
        io.to(`${users[index].socketId}`).emit('alertPosition' , { user: data.userName })
    }
}

module.exports = {
    newTodo,
    alertPosition
}