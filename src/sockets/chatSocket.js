const userCollection = require('../db/models/userSchema');
const chatCollection = require('../db/models/chatSchema');

const getChat = async (data, callback) => {

    let chat = {}

    if(data.chatFrom){ chat = await chatCollection.findOne({ 'from': data.chatFrom}) }        
    else{ chat = await chatCollection.findOne({ 'from': data.userName}) }

    callback(chat)
}

const messageToManager = async (data , users, io) => { 

    let chatToSend =[]
    let chat = await chatCollection.findOne({ 'from': data.userName})    
    const manager = await userCollection.findOne({ 'rol': 'manager' })         
    let managerId = null
    let employeeId = null          
    
    let idx = users.findIndex( user => user.userName === manager.userName )
    if(idx >= 0){ managerId = users[idx].socketId }

    idx = users.findIndex( user => user.userName === data.userName )
    if(idx >= 0){ employeeId = users[idx].socketId }

    if(chat){                    
        let chatCreated = chat.chat
        chatCreated.push({ 
            date: data.date,
            message: data.message,
            userName: data.userName,
            typeMessage: data.typeMessage                   
        })   
        chat.chat =  chatCreated
        chatToSend = { 
            date: data.date,
            message: data.message,
            userName: data.userName,
            typeMessage: data.typeMessage
        }
        chat.save()
    }else{
        let newChat = new chatCollection({
            from: data.userName,
            to: manager.userName,
            chat: [{ 
                date: data.date,
                message: data.message,
                userName: data.userName,
                typeMessage: data.typeMessage                 
            }]
        })         
        chatToSend = { 
            date: data.date,
            message: data.message,
            userName: data.userName,
            typeMessage: data.typeMessage                  
        }
        newChat.save()
    }
    io.to(`${employeeId}`).emit('newMessage', chatToSend) 
    if(managerId){ io.to(`${managerId}`).emit('newMessage', chatToSend) }

}

const messageFromManager = async (data, users, io) => { 

    let chat = await chatCollection.findOne({ 'from': data.from})                         
    let managerId = null
    let employeeId = null 

    let idx = users.findIndex( user => user.userName === data.userName )
    if(idx >= 0){ managerId = users[idx].socketId }

    idx = users.findIndex( user => user.userName === data.from )
    if(idx >= 0){ employeeId = users[idx].socketId }

    let chatCreated = chat.chat
    chatCreated.push({ 
        date: data.date,
        message: data.message,
        userName: data.userName   ,
        typeMessage: data.typeMessage                       
    })   
    chat.chat =  chatCreated
    chat.save()

    io.to(`${managerId}`).emit('newMessage', data)
    if(employeeId){ io.to(`${employeeId}`).emit('newMessage', data) }

}

module.exports = {
    getChat,
    messageToManager,
    messageFromManager,
}