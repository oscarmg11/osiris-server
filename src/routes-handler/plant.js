const getStream = require('into-stream');
const moment = require('moment')
const mongoose = require('mongoose')

const {getBlobName, containerName, blobService, getFileUrl} = require('../azure')

const plantCollection = require('../db/models/plantSchema');

const getPlant = async (req, res) => {
    const { id } = req.query
    const { plantsUser } = req.body
    if(id){
        let plants = plantsUser        
        let plant = await plantCollection.findById(id.replace(/\"/g, ''))
        if(plant){
            const idx = plants.findIndex( plantID => plantID == id.replace(/\"/g, '') )
            if(idx >= 0){ res.status(200).json({plant, status: true}) }
            else{ res.status(400).send('No tienes permiso para leer este código') }
        }else{
            res.status(400).send('Este código no puede ser leído por esta aplicación')
        }
    }else{
        res.sendStatus(500)
    }   
}

const getPLantsReported = async (req,res) => {
    let plants = await plantCollection.find({ statusReported: true })    
    res.status(200).json({ plants })
}

const getSpecificPlant = async (req,res) => {
    const { serialNumber, width, widthType, height, heightType, numberFruits, numberFruitsType, section, reported, ownerID } = req.query
    let plants = []
    let queryObject = { owner: ownerID }
    if(serialNumber !== ''){
        const plantsFound = await plantCollection.find({ 'owner': ownerID }).sort({ serialNumber: 1 })   
        plants = [plantsFound[Number(serialNumber)-1]]
    }else{        
        if(width !== ""){
            if(widthType === 'more'){
                queryObject.width = { $gt: parseInt(width) }
            }
            if(widthType === 'less'){
                queryObject.width = { $lt: parseInt(width) }
            }
        }
        if(height !== ""){
            if(heightType === 'more'){
                queryObject.height = { $gt: parseInt(height) }
            }
            if(heightType === 'less'){
                queryObject.height = { $lt: parseInt(height) }
            }
        }
        if(numberFruits !== ""){
            if(numberFruitsType === 'more'){
                queryObject.numberFruits = { $gt: parseInt(numberFruits) }
            }
            if(numberFruitsType === 'less'){
                queryObject.numberFruits = { $lt: parseInt(numberFruits) }
            }
        }
        if(section !== ""){
            queryObject.section = section
        }
        if(reported === "true"){
            queryObject.statusReported = true
        }
        plants = await plantCollection.find(queryObject)
    }    
    res.status(200).json({ plants })
        
}

const getPlantBySection = async (req,res) => {
    const { value } = req.query 
    let plants = await plantCollection.find({ 'section': value })     
    res.status(200).json({ plants })
}

const updatePlant = async (req, res) => {    
    const { id, name, width, height, numberFruits, temperature, type, date, plantedDate } = req.body.newPlant    
    let plant = await plantCollection.findById(id.replace(/\"/g, ''))     
    updateDate = moment(date).format('DD MM YYYY')

    plant.name = name 
    plant.width = width
    plant.height = height
    plant.temperature = temperature
    plant.numberFruits = numberFruits
    plant.type = type
    plant.lastUpdate = updateDate.replace(/\s/g, '/')
    plant.plantedDate = plantedDate
    plant.save()
    res.status(200).json({plant})
}

const deleteReport = async (req,res) => {
    let { id } = req.body    
    let plant = await plantCollection.findById(id.replace(/\"/g, ''))
    for(let i = 0; i < plant.imagesReport.length; i++){
        blobService.deleteBlobIfExists(containerName, plant.imagesReport[i].uri.split('/')[4], (err, result) => {
            if(err) {
                res.sendStatus(500)
                return;
            }
        })
    }
    plant.statusReported = false
    plant.report= {}
    plant.imagesReport= []
    plant.save()
    let plants = await plantCollection.find({ statusReported: true })    
    res.status(200).json({ deleted: true, plants })
}

const reportPlant = async (req, res) => { 
    const files = req.files    
    const { user, plantid, description, date } = req.body
    try{
        let plant = await plantCollection.findById(plantid.replace(/\"/g, ''))
        let imagesReport = []
        if(plant.imagesReport){ imagesReport = plant.imagesReport }
        for(let i = 0; i < files.length; i++){
            let blobName = getBlobName(files[i].originalname)
            let stream = getStream(files[i].buffer)
            let streamLength = files[i].buffer.length
            imagesReport.push({ uri: getFileUrl(blobName) })
            blobService.createBlockBlobFromStream(containerName, blobName, stream, streamLength, err => {
                if(err) {
                    res.sendStatus(500)
                    return;
                }
    
            });
        }
        plant.statusReported = true
        plant.report.user = user
        plant.report.description = description
        plant.report.date = date
        plant.imagesReport = imagesReport        
        plant.save()
        res.status(200).json({ reported: true })
    }catch(e){        
        res.sendStatus(500)
    }
}

const updatePlants = async (req, res) => {
    try{
        const { plants } = req.body
        console.log(plants)
        for(let i = 0; i < plants.length; i++){
            const { id, name, width, height, numberFruits, type, date, plantedDate } = plants[i]    
            let plant = await plantCollection.findById(id.replace(/\"/g, ''))     
            updateDate = moment(date).format('DD MM YYYY')
            if(name !== ""){ plant.name = name }
            if(width !== ""){ plant.width = Number(width) }
            if(height !== ""){ plant.height = Number(height) }
            if(numberFruits !== ""){ plant.numberFruits = Number(numberFruits) }
            if(type !== "" ){ plant.type = type }
            if(plantedDate !== ""){ plant.plantedDate = plantedDate }
            plant.lastUpdate = updateDate.replace(/\s/g, '/')
            plant.save()
        }
        res.sendStatus(200)
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
}

module.exports = {
    getPlant,
    getPLantsReported,
    getSpecificPlant,
    getPlantBySection,
    updatePlant,
    deleteReport,
    reportPlant,
    updatePlants
}