const chatCollection = require('../db/models/chatSchema');

const getChats = async (req, res) => {
    let chats = await chatCollection.find()
    res.status(200).json({ chats })
}

module.exports = {
    getChats
}