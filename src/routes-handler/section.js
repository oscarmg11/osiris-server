const moment = require('moment');
const axios = require('axios');

const sectionCollection = require('../db/models/sectionsSchema');
const plantCollection = require('../db/models/plantSchema');
const userCollection = require('../db/models/userSchema');

const { numberToSerialNumber } = require('../helpers');

const getSections = async (req, res) => {
    let sections = await sectionCollection.find()
    res.status(200).json({ sections })
}

const getInfoSection = async (req, res) => {
    let { id } = req.query
    let section = await sectionCollection.findById(id)
    const plantsOwner = await plantCollection.find({ owner: section.owner }).sort({ serialNumber: 1 })    
    const initialPlant = section.plants.split('-')[0]
    const finalPlant = section.plants.split('-')[1]    
    let plants = []
    for(let i = Number(initialPlant) - 1; i < Number(finalPlant); i++){
        plants.push( plantsOwner[i] )
    }
    let employees = []
    for(let i = 0; i < section.employees.length; i++){
        let employee = await userCollection.findById(section.employees[i].idEmployee)
        employees.push(employee)
    }
    res.status(200).json({ plants, employees, section })
}

const createSection = async (req,res) => {
    try{
        const { coordinates, sectionName, employees, plants, owner, checkDateFrom } = req.body

        console.log(coordinates)

        coordinates.forEach((coordinate) => { delete coordinate._id })
        let sections = await sectionCollection.find({ owner })
        const plantsOwner = await plantCollection.find({ owner }).sort({ serialNumber: 1 })

        for(let i = 0; i < sections.length; i++){
            if((Number(sections[i].plants.split('-')[0]) <= Number(plants.split('-')[0]) && Number(sections[i].plants.split('-')[1]) >= Number(plants.split('-')[0])) ||
            (Number(sections[i].plants.split('-')[0]) <= Number(plants.split('-')[1]) && Number(sections[i].plants.split('-')[1]) >= Number(plants.split('-')[1]))){
                return res.status(400).send('Ya existe algúna sección que tiene asignada alguna de las plantas ingresadas.')
            }
        }

        let plantFrom = numberToSerialNumber(plants.split('-')[0])
        let plantTo = numberToSerialNumber(plants.split('-')[1])

        let date = moment(checkDateFrom, 'DD/MM/YYYY').add(28, 'day').toDate()
        let dateFormated = moment(date).format('DD/MM/YYYY')

        const resWeather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Lerdo&units=metric&appid=${process.env.OPENWEATHERMAP_KEY}`)       
        const temperature = resWeather.data.main.temp

        let newSection = new sectionCollection({
            sectionName,
            coordinates,
            plants: `${plantFrom}-${plantTo}`,
            owner,
            employees,
            checkDateFrom,
            checkDateTo: dateFormated,
            temperature
        })
        newSection.save(async (err, newSection) => {
            if(err){
                return res.status(400).send('Ya existe algúna sección con el mismo nombre. Este dato tiene que ser único.')
            }
            for(let j = 0; j < employees.length; j++){
                let plantFrom = numberToSerialNumber(employees[j].plants.split('-')[0])
                let plantTo = numberToSerialNumber(employees[j].plants.split('-')[1])
    
                let plantsToEmployee = []
    
                for(let k = Number(plantFrom) - 1; k < Number(plantTo); k++){
                    plantsToEmployee.push( plantsOwner[ k ]._id )
                }
    
                let employee = await userCollection.findById(employees[j].idEmployee)
                employee.plantsToDisplay = `${plantFrom}-${plantTo}`
                employee.plants = plantsToEmployee
                employee.section = newSection._id
                employee.missingPlants = `${plantFrom}-${plantTo}`
                employee.save()
            }
            for(let i = Number(plantFrom) - 1; i < Number(plantTo); i++ ){
                plantsOwner[i].section = sectionName
                plantsOwner[i].save()
            }
            res.json({ updated: true })
        })
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
}

const updateSection = async (req, res) => { 
    try{
        const { id } = req.params
        const { coordinates, sectionName, employees, plants, owner, checkDateFrom } = req.body
        let sections = await sectionCollection.find({ owner })
        for(let i = 0; i < sections.length; i++){
            if(sections[i]._id != id){
                if((Number(sections[i].plants.split('-')[0]) >= Number(plants.split('-')[0]) && Number(sections[i].plants.split('-')[0]) <= Number(plants.split('-')[1])) ||
                (Number(sections[i].plants.split('-')[0]) >= Number(plants.split('-')[0]) && Number(sections[i].plants.split('-')[1]) <= Number(plants.split('-')[1]))){
                    return res.status(400).send('Ya existe algúna sección que tiene asignada alguna de las plantas ingresadas.')
                }
            }
        }
        const plantsOwner = await plantCollection.find({ owner }).sort({ serialNumber: 1 })

        let plantFrom = numberToSerialNumber(plants.split('-')[0])
        let plantTo = numberToSerialNumber(plants.split('-')[1])

        let date = moment(checkDateFrom, 'DD/MM/YYYY').add(28, 'day').toDate()
        let dateFormated = moment(date).format('DD/MM/YYYY')
        let section = await sectionCollection.findById(id)
        coordinates.forEach((coordinate) => { delete coordinate._id })
        section.owner = owner
        section.coordinates = coordinates
        section.sectionName = sectionName
        section.employees = employees
        section.plants = `${plantFrom}-${plantTo}`
        section.checkDateFrom = checkDateFrom
        section.checkDateTo = dateFormated
        section.save()        
        for(let j = 0; j < employees.length; j++){
            if(employees[j].plants){
                let plantFrom = numberToSerialNumber(employees[j].plants.split('-')[0])
                let plantTo = numberToSerialNumber(employees[j].plants.split('-')[1])
    
                let plantsToEmployee = []
    
                for(let k = Number(plantFrom) - 1; k < Number(plantTo); k++){
                    plantsToEmployee.push( plantsOwner[ k ]._id )
                }
    
                let employee = await userCollection.findById(employees[j].idEmployee)
                employee.plantsToDisplay = `${plantFrom}-${plantTo}`
                employee.plants = plantsToEmployee
                employee.section = section._id
                employee.missingPlants = `${plantFrom}-${plantTo}`
                employee.save()
            }
        }
        for(let i = Number(plantFrom) - 1; i < Number(plantTo); i++ ){
            plantsOwner[i].section = sectionName
            plantsOwner[i].save()
        }
        res.json({ updated: true })
    }catch(e){
        console.log(e)
        res.sendStatus(500)
    }
}

const deleteSection = async (req, res) => {
    try{
        let { id } = req.params
        let section = await sectionCollection.findByIdAndRemove(id)
        let employees = []
        for(let i = 0; i< section.employees.length; i++){
            let employee = await userCollection.findById(section.employees[i].idEmployee)
            employees.push(employee.name)
        }
        res.json({ section, employees})

    }catch(e){
        res.sendStatus(500)   
    }
}

module.exports = {
    getSections,
    getInfoSection,
    updateSection,
    deleteSection,
    createSection
}