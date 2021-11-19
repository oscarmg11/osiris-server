
const { getChat, messageToManager, messageFromManager } = require('./chatSocket')
const { newTodo, alertPosition } = require('./userSocket')

module.exports = (io) => {

    let users = []      

    io.on('connection', (socket) => {    

        socket.emit('userConnected', (data) => {
            let index = users.findIndex( user => user.userName === data.userName )

            if(index >= 0){
                users[index] = {
                    userName: data.userName,
                    socketId: socket.id 
                }
            }else{
                users.push({
                    userName: data.userName,
                    socketId: socket.id  
                })
            }

            console.log(users)
        })
        
        socket.on('userConnectedToChat', getChat)

        socket.on('userConnectDevelopment', (data) => {
            let index = users.findIndex( user => user.userName === data.userName )

            if(index >= 0){
                users[index] = {
                    userName: data.userName,
                    socketId: socket.id 
                }
            }else{
                users.push({
                    userName: data.userName,
                    socketId: socket.id  
                })
            }

            console.log(users)
        })

        socket.on('messageFromManager', (data) => { messageFromManager(data, users, io) })         
        
        socket.on('messageToManager', (data) => { messageToManager(data, users, io) })        

        socket.on('newTodo', (data) => { newTodo(data, users, io) })

        socket.on('alertPosition', (data) => { alertPosition(data, users, io) })

        socket.on('disconnect' , () => {
            let index = users.findIndex( user => user.socketId === socket.id )
            users.splice(index,1)
            
        })
    })
}