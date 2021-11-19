const jwt = require('jsonwebtoken');
const getStream = require('into-stream');
const moment = require('moment');

const userCollection = require('../db/models/userSchema');
const sectionCollection = require('../db/models/sectionsSchema');
const plantCollection = require('../db/models/plantSchema');
const chatCollection = require('../db/models/chatSchema');

const {getBlobName, containerName, blobService, getFileUrl} = require('../azure')

const { numberToSerialNumber } = require('../helpers');

const getUsers  = async (req,res)=> {
    try{
        const { rol, sections, section, rol2 } = req.query
        let users = []
        if(rol2){
            let owners = await userCollection.find({ 'rol': rol2 }, 'name userName rol nPlants')
            let employees = await userCollection.find({ 'rol': rol }, 'name userName photo address plants section todos rol plantsToDisplay nPlants meanReads')
            for(let i = 0; i < employees.length; i++){
                let section = await sectionCollection.findById(employees[i].section)
                if(section){ employees[i].section = section.sectionName }
            }
            res.json({ employees, owners })
            return
        }
        if(section){ 
            let sectionDB = await sectionCollection.findOne({ 'sectionName': section })
            users = await userCollection.find({ 'section': sectionDB._id }, 'name userName photo address plants section todos rol plantsToDisplay nPlants meanReads')
            for(let i = 0; i < users.length; i++){
                users[i].section = sectionDB.sectionName
            }
        }
        else{ 
            users = await userCollection.find({ 'rol': rol }, 'name userName photo address plants section todos rol plantsToDisplay nPlants meanReads') 
            if(rol === "employee"){
                for(let i = 0; i < users.length; i++){
                    let section = await sectionCollection.findById(users[i].section)
                    users[i].section = section.sectionName
                }
            }
        }
        if(sections){
            let sections = await sectionCollection.find({})
            res.status(200).json({ users, sections }) 
            return
        }    
        res.json({ users })
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
}

const login = async (req, res) => {
    try{
        const { userName, password } = req.body 
        let user = await userCollection.findOne({"userName": userName})   
        if(user){
            if(user.validPassword(password)){ 
                const payload= {
                    userName,
                    rol: user.rol,
                    _id: user._id
                }
                let token = jwt.sign(payload, process.env.JWT_SEED , { expiresIn: 60 * 60 * 24 });
                token = `${process.env.TOKEN_HEADER} ${token}`
                if(user.rol === "employee"){
                    
                    let section = await sectionCollection.findById(user.section)
                    if(!section){ return res.status(400).send('Este usuario no está asignado a ninguna sección. Un administrador debe .') }
                    
                    let userResponse = {
                        userName, 
                        rol: user.rol, 
                        todos:user.todos, 
                        plants: user.plants, 
                        id: user._id, 
                        missingPlants: user.missingPlants,
                        section: section.coordinates
                    }
                    res.json({ logged: true, user: userResponse, token }) 
                }else if(user.rol === "manager"){                
                    res.json({ logged: true, user: {userName, rol: user.rol, id: user._id }, token }) 
                }else if(user.rol === "admin"){                
                    res.json({ logged: true, user: {userName, rol: user.rol, id: user._id }, token }) 
                }else if(user.rol === "owner"){                
                    res.json({ logged: true, user: {userName, rol: user.rol, id: user._id }, token }) 
                }
            }
            else{ res.status(200).json({ logged: false, user: {} }) }
        }else{
            res.json({ logged: false, user: {}})
        }
    }catch(e){
        res.sendStatus(500)
    }
    
}

const updateUserwPhoto = async (req, res) => {
    try{
        let { file } = req
        let { id, userName, name, address, section, plants } = req.body 
        let user = await userCollection.findById(id)
        let blobName = ''
        if(user.photo.split('/')[4]){
            blobService.deleteBlobIfExists(containerName, user.photo.split('/')[4], (err, result) => {
                if(err) {
                    res.sendStatus(500)
                    return;
                }
            })
            blobName = getBlobName(file.originalname)
            let stream = getStream(file.buffer)
            let streamLength = file.buffer.length
            blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
                if(err) {
                    res.sendStatus(500)
                    return;
                }
            });
        }else{
            blobName = getBlobName(file.originalname)
            let stream = getStream(file.buffer)
            let streamLength = file.buffer.length
            blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
                if(err) {
                    res.sendStatus(500)
                    return;
                }
        
            });
        }
        if(user.rol === "employee"){
            let chat = await chatCollection.findOne({ 'from': user.userName })
            if(chat){
                chat.from = userName
                chat.save()
            }
        }else if(user.rol === "manager"){
            let chats = await chatCollection.find({ 'to': user.userName })
            for(let i = 0; i < chats.length; i++){
                chats[i].to = userName
                chats[i].save()
            }
        }

        let lastValuePlants
        if(plants){ 
            lastValuePlants = user.nPlants
            user.nPlants = plants 
        }

        user.userName = userName
        user.name = name
        user.photo = getFileUrl(blobName)
        user.address = address
        
        user.save(async (err, newUser) => {
            if(err){
                return res.status(400).send('Ya existe algún empleado con el mismo usuario. Este dato tiene que ser único.')
            }
            
            if(newUser.rol === "owner"){
                
                let difference = Number(newUser.nPlants) - Number(lastValuePlants)

                if(difference > 0){                    

                    let plantsOwned = await plantCollection.find({ 'owned': false }).sort({ serialNumber: 1 })

                    let plantFrom = plantsOwned[0].serialNumber
                    let plantTo = plantsOwned[ difference].serialNumber

                    await plantCollection.updateMany({ serialNumber: { $gte: plantFrom, $lte: plantTo } },{ owned: true, owner: newUser._id })
                }else if(difference < 0){

                    let plantsOwned = await plantCollection.find({ 'owner': newUser._id }).sort({ serialNumber: 1 })

                    let plantFrom = plantsOwned[plantsOwned.length - difference].serialNumber
                    let plantTo = plantsOwned[ plantsOwned.length - 1].serialNumber

                    await plantCollection.updateMany({ serialNumber: { $gte: plantFrom, $lte: plantTo } },{ owned: false })

                }
            
            }

            delete newUser.password
            res.status(200).json({ user: newUser })
        })
    }catch(e){   
        console.log(e)     
        res.sendStatus(500)
    }
}

const createUser = async (req, res) => {

    try{
        let { file } = req
        let { userName, name, address, password, rol, plants } = req.body

        let blobName = getBlobName(file.originalname)
        let stream = getStream(file.buffer)
        let streamLength = file.buffer.length

        blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
            if(err) {
                res.sendStatus(500)
                return;
            }

        });   

        let newUser = {
            userName,
            name, 
            address,
            rol,
            photo: getFileUrl(blobName)
        }

        if(plants){ newUser.nPlants = plants } 

        let user = new userCollection(newUser)

        let passwordHashed = user.generateHash(password)
        user.password = passwordHashed

        user.save(async (err, newUserDB) => {
            if(err){
                blobService.deleteBlobIfExists(containerName, blobName, (err, result) => {
                    if(err) {
                        res.sendStatus(500)
                        return; 
                    }
                })
                return res.status(400).send('Ya existe algún empleado con el mismo usuario. Este dato tiene que ser único.')
            }

            if(newUserDB.rol === "owner"){
                
                let plantsOwned = await plantCollection.find({ 'owned': false }).sort({ serialNumber: 1 })

                let plantFrom = plantsOwned[0].serialNumber
                let plantTo = plantsOwned[ Number(newUserDB.nPlants ) - 1 ].serialNumber

                await plantCollection.updateMany({ serialNumber: { $gte: plantFrom, $lte: plantTo } },{ owned: true, owner: newUserDB._id })
            
            }
            
            
            delete newUserDB.password
            res.json({ user: newUserDB })
        })

    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }

}

const updatewoPhoto = async (req, res) => {
    try{
        let { id, userName, name, address, plants } = req.body
        let user = await userCollection.findById(id)
        if(user.rol === "employee"){
            let chat = await chatCollection.findOne({ 'from': user.userName })
            if(chat){
                chat.from = userName
                chat.save()
            }
        }else if(user.rol === "manager"){
            let chats = await chatCollection.find({ 'to': user.userName })
            for(let i = 0; i < chats.length; i++){
                chats[i].to = userName
                chats[i].save()
            }
        }

        let lastValuePlants

        if(plants){ 
            lastValuePlants = user.nPlants
            user.nPlants = plants 
        }

        user.userName = userName
        user.name = name
        user.address = address
              
        user.save( async(err, newUser) => {
            if(err){
                return res.status(400).send('Ya existe algún empleado con el mismo usuario. Este dato tiene que ser único.')
            }

            if(newUser.rol === "owner"){
                
                let difference = Number(newUser.nPlants) - Number(lastValuePlants)

                if(difference > 0){                    

                    let plantsOwned = await plantCollection.find({ 'owned': false }).sort({ serialNumber: 1 })

                    let plantFrom = plantsOwned[0].serialNumber
                    let plantTo = plantsOwned[ difference].serialNumber

                    await plantCollection.updateMany({ serialNumber: { $gte: plantFrom, $lte: plantTo } },{ owned: true, owner: newUser._id })
                }else if(difference < 0){

                    let plantsOwned = await plantCollection.find({ 'owner': newUser._id }).sort({ serialNumber: 1 })

                    let plantFrom = plantsOwned[plantsOwned.length - difference].serialNumber
                    let plantTo = plantsOwned[ plantsOwned.length - 1].serialNumber

                    await plantCollection.updateMany({ serialNumber: { $gte: plantFrom, $lte: plantTo } },{ owned: false })

                }
            
            }

            delete newUser.password
            res.status(200).json({ user: newUser })
        })
    }catch(e){     
        console.log(e)   
        res.sendStatus(500)
    }
}

const createNewTodo = async (req,res) => {
    try{        
        let {title, description, plants, plantsAlreadyOrdenated, userName } = req.body 
        if(plantsAlreadyOrdenated){
            let user = await userCollection.findOne({ 'userName': userName })
            if(!user){ return res.status(400).send('Este usuario ya no existe.') }
            let todos = user.todos
            let todo = description
            let todoObject = {
                title,
                todo,
                status: false
            }
            todos.push(todoObject)
            user.save()
            res.status(200).json({ todo: todoObject, users: [user] })
        }else{
            plants = JSON.parse(plants)
            let todoObject = {}
            let usersResponse = []
            for(let i = 0; i < plants.length; i++){
                let todo = description + `\nPlantas:`
                let users = await userCollection.find({ 'section': plants[i].section })
                for(let j = 0; j < plants[i].number.length; j++){
                    todo += `\n${plants[i].number[j]}`
                }        
                for(let j = 0; j < users.length; j++){
                    let todos = users[j].todos
                    todoObject = {
                        title,
                        todo,
                        status: false,
                        imgs: []
                    }
                    todos.push(todoObject)
                    usersResponse.push(users[j])
                    users[j].todos = todos
                    users[j].save()
                }
            }
            res.status(200).json({ todo: todoObject, users: usersResponse })
        }
    }catch(e){

        res.sendStatus(500)
    }
}

const createNewTodowMedia = async (req,res) => {
    
    try{
        const files = req.files
        let media = []
        let {title, description, plants, plantsAlreadyOrdenated, userName } = req.body
        
        if(plantsAlreadyOrdenated){
            let user = await userCollection.findOne({ 'userName': userName })
            if(!user){ return res.status(400).send('Este usuario ya no existe.') }
            for(let i = 0; i < files.length; i++){
                let blobName = getBlobName(files[i].originalname)
                let stream = getStream(files[i].buffer)
                let streamLength = files[i].buffer.length
                media.push({ uri: getFileUrl(blobName) })
                blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
                        if(err) {
                            res.sendStatus(500)
                            return;
                        }

                }); 
            }
            let todos = user.todos
            let todo = description 
            let todoObject = {
                title,
                todo,
                status: false,
                imgs: media
            }
            todos.push(todoObject)
            user.todos = todos
            user.save()            
            res.status(200).json({ todo: todoObject, users: [user] })
        }else{
            plants = JSON.parse(plants)
            let usersResponse = []
            let todoObject = {}
            for(let i = 0; i < plants.length; i++){
                let todo = description + `\nPlantas:`
                let users = await userCollection.find({ 'section': plants[i].section })
                for(let j = 0; j < plants[i].number.length; j++){
                    todo += `\n${plants[i].number[j]}`
                }
                for(let i = 0; i < files.length; i++){
                    let blobName = getBlobName(files[i].originalname)
                    let stream = getStream(files[i].buffer)
                    let streamLength = files[i].buffer.length
                    media.push({ uri: getFileUrl(blobName) })
                    blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
                        if(err) {
                            res.sendStatus(500)
                            return;
                        }
        
                    }); 
                }        
                for(let j = 0; j < users.length; j++){
                    if(users[j]){
                        let todos = users[j].todos
                        todoObject = {
                            title,
                            todo,
                            status: false,
                            imgs: media
                        }
                        todos.push(todoObject)
                        usersResponse.push(users[j])
                        users[j].todos = todos
                        users[j].save()
                    }
                }
            }
            res.status(200).json({ todo: todoObject, users: usersResponse })
        }
    }catch(e){        
        res.sendStatus(500)
    }
}

const completeTodo = async (req,res)=> {
    try{
        const {todoId, userName} = req.body      
        const user = await userCollection.findOne({ "userName": userName })    
        let {todos} = user
        for(let i = 0; i < todos.length; i++){
            if(todos[i].id === todoId){ 
                todos[i].status = true
            }
        }    
        user.todos = todos
        user.save()
        res.json({todos: user.todos})
    }catch(e){
        res.sendStatus(500)
    }
}

const deleteUser = async (req,res)=> {
    try{
        const { id } = req.body       
        let user = await userCollection.findById(id)   
        if(user.photo) {
            blobService.deleteBlobIfExists(containerName, user.photo.split('/')[4], (err, result) => {
                if(err) {
                    res.sendStatus(500)
                    return; 
                }
            })
        }
        if(user.rol === "employee"){
            let section = await sectionCollection.findById(user.section)
            if(section){
                let index = section.employees.findIndex(employee => employee.idEmployee == id)
                if(index >= 0){
                    let newEmployees = section.employees
                    newEmployees.splice(index, 1)
                    section.employees = newEmployees
                    section.save()
                }
            }
            let chatFromUser = await chatCollection.findOne({ 'from': user.userName })
            if(chatFromUser){
                let chat = chatFromUser.chat
                for(let j = 0; j < chat.length; j++){
                    if(chat[j].typeMessage === "audio"){
                        blobService.deleteBlobIfExists(containerName, chat[j].message.split('/')[4], (err, result) => {
                            if(err) {
                                console.log(err)
                                return;
                            }
                        })
                    }
                }
                await chatCollection.findOneAndRemove({ 'from': user.userName })
            }

        }if(user.rol === "owner"){
            await plantCollection.updateMany({ 'owner': user._id }, { 'owned': false })
        }
        await userCollection.findByIdAndRemove(id)
        res.sendStatus(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
}

const deleteTodo = async (req,res)=> {
    try{
        const {todoId, userName} = req.body       
        const user = await userCollection.findOne({ "userName": userName })    
        let {todos} = user
        let index = todos.findIndex( todo => todo._id === todoId )
        todos.splice(index,1)
        user.todos = todos       
        user.save()
        todos.forEach( todo => {
            for(let i = 0; i < todo.imgs.lenght; i++){
                blobService.deleteBlobIfExists(containerName, todo.imgs[i].split('/')[4], (err, result) => {
                    if(err) {
                        res.sendStatus(500)
                        return; 
                    }
                })
            }
        })
        delete user.password
        res.status(200).json({user: [user]}) 
    }catch(e){        
        res.sendStatus(500)
    }
    
}

const finisReading = async (req, res) => {
    try{
        const {reads, userName, dateStarted, dateFinished} = req.body
        let user = await userCollection.findOne({ "userName": userName })
        let mean = (dateFinished - dateStarted) / reads.length
        mean = mean / 60000
        user.reads = reads
        user.meanReads = Number(mean.toFixed(2))
        user.save() 
        res.status(200).json({})
    }catch(e){
        res.sendStatus(500)
    }
}

const getTemperature = async (req, res) => {
    try{
        let section = await sectionCollection.findOne({ })
        res.json({ temperature: section.temperature })
    }catch(e){ res.sendStatus(500) }
}

const sendAudio = async (req, res) => {
    try{
        const { file } = req
        let blobName = getBlobName(file.originalname)
        let stream = getStream(file.buffer)
        let streamLength = file.buffer.length
        blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
            if(err) {
                res.sendStatus(500)
                return;
            }

        }); 
        res.json({ audioURI: getFileUrl(blobName) })
    }catch(e){        
        res.sendStatus(500)
    }
}

const updatePassword = async (req, res) => {
    try{
        const { password, id } = req.body
        let user = await userCollection.findById(id)
        let passwordHashed = user.generateHash(password)
        user.password = passwordHashed
        user.save()
        delete user.password
        res.json({ user })
    }catch(e){
        res.sendStatus(500)
    }
}

module.exports = {
    getUsers,
    login,
    updateUserwPhoto,
    createUser,
    updatewoPhoto,
    createNewTodo,
    completeTodo,
    deleteUser,
    deleteTodo,
    finisReading,
    createNewTodowMedia,
    getTemperature,
    sendAudio,
    updatePassword
}