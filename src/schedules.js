const CronJob = require('cron').CronJob;
const axios = require('axios').default;
const moment = require('moment')

const sectionCollection = require('./db/models/sectionsSchema')
const userCollection = require('./db/models/userSchema')
const plantCollection = require('./db/models/plantSchema')
const chatCollection = require('./db/models/chatSchema')

const { checkDate, missingPlantsFormatted, numberToSerialNumber } = require('./helpers');

const { containerName, blobService} = require('./azure')

const jobGetWeather = new CronJob('0 */30 * * * *', () => {
//const jobGetWeather = new CronJob('0 */1 * * * *', () => {
    axios.get(`https://api.openweathermap.org/data/2.5/weather?q=Lerdo&units=metric&appid=${process.env.OPENWEATHERMAP_KEY}`)
        .then((res) => {
            const temperature = res.data.main.temp
            console.log(temperature)
            sectionCollection.updateMany({}, { temperature }, (err, res) => {
                if(err){
                    console.log(err)
                }
            })
        }).catch((e) => console.log(e))
});

const jobCheckEmployeeDone = new CronJob('0 0 3 */1 * *', async () => {
//const jobCheckEmployeeDone = new CronJob('0 */1 * * * *', async () => {
    try{
        const employees = await userCollection.find({ 'rol': 'employee' })

        for(let i = 0; i < employees.length; i++){

            let section = await sectionCollection.findById(employees[i].section)

            if(section){
                let plantsOwner = await plantCollection.find({ 'owner': section.owner }).sort({ serialNumber: 1 })

                let dateCheckFrom = moment(moment(section.checkDateFrom, 'DD/MM/YYYY').subtract(1, 'day').toDate()).format('DD/MM/YYYY')
                let dateCheckTo = moment(moment(section.checkDateTo, 'DD/MM/YYYY').add(1, 'day').toDate()).format('DD/MM/YYYY')            
    
                let plantFrom = numberToSerialNumber(employees[i].plantsToDisplay.split('-')[0])
                let plantTo = numberToSerialNumber(employees[i].plantsToDisplay.split('-')[1])                
    
                let plants = []
    
                for(let j = Number(plantFrom) - 1; j < Number(plantTo); j++){
                    plants.push( plantsOwner[j] )
                }
    
                let missingPlants = []
    
                for(let j = 0; j < plants.length; j++){
                    if(plants[j].lastUpdate){
                        if(!checkDate(plants[j].lastUpdate, dateCheckFrom, dateCheckTo)){
                            missingPlants.push(plants[j].serialNumber)
                        }
                    }else{
                        missingPlants.push(plants[j].serialNumber)
                    }
                }
                
                employees[i].missingPlants = missingPlantsFormatted(missingPlants)
                employees[i].save()
            }
           
        }
    }catch(e){ console.log(e) }
});

const jobCheckSectionDone = new CronJob('0 40 3 */1 * *', async () => {
    //const jobCheckEmployeeDone = new CronJob('0 */1 * * * *', async () => {
        try{
            const sections = await sectionCollection.find({})
    
            for(let i = 0; i < sections.length; i++){
    
                let plantsOwner = await plantCollection.find({ 'owner': sections[i].owner }).sort({ serialNumber: 1 })
    
                let dateCheckFrom = moment(moment(sections[i].checkDateFrom, 'DD/MM/YYYY').subtract(1, 'day').toDate()).format('DD/MM/YYYY')
                let dateCheckTo = moment(moment(sections[i].checkDateTo, 'DD/MM/YYYY').add(1, 'day').toDate()).format('DD/MM/YYYY')            
    
                let plantFrom = numberToSerialNumber(sections[i].plants.split('-')[0])
                let plantTo = numberToSerialNumber(sections[i].plants.split('-')[1])                
    
                let plants = []
    
                for(let j = Number(plantFrom) - 1; j < Number(plantTo); j++){
                    plants.push( plantsOwner[j] )
                }
    
                let count = 0
    
                for(let j = 0; j < plants.length; j++){
                    if(plants[j].lastUpdate){
                        if(!checkDate(plants[j].lastUpdate, dateCheckFrom, dateCheckTo)){ count++ }
                    }else{ count++ }
                }
                
                if(count === 0){
                    sections[i].finishRead = true
                    sections[i].save()
                }
               
            }
        }catch(e){ console.log(e) }
    });

const jobCheckChat = new CronJob('0 10 3 */1 * *', async () => {
//const jobCheckChat = new CronJob('0 */1 * * * *', async () => {
    let chats = await chatCollection.find({})
    for(let i = 0; i < chats.length; i++){
        let chat = chats[i].chat
        for(let j = 0; j < chat.length; j++){
            if(chat[j].days === 3 && chat[j].typeMessage === "audio"){
                blobService.deleteBlobIfExists(containerName, chat[j].message.split('/')[4], (err, result) => {
                    if(err) {
                        console.log(err)
                        return;
                    }
                })
            }
        }
    }
    await chatCollection.updateMany({}, { '$pull': { 'chat':  { 'days': 3 } } })
    await chatCollection.updateMany({}, { '$inc': {'chat.$[].days': 1}  })
});

const jobCheckDate = new CronJob('0 20 3 */1 * *', async () => {
//const jobCheckDate = new CronJob('0 */1 * * * *', async () => {    
    const sections = await sectionCollection.find({})
    for(let i = 0; i < sections.length; i++){
        const lastDateTo = moment(moment(sections[i].checkDateTo, 'DD/MM/YYYY').add(1, 'day').toDate()).format('DD/MM/YYYY')
        const lastDateFrom = moment(moment(sections[i].checkDateFrom, 'DD/MM/YYYY').subtract(1, 'day').toDate()).format('DD/MM/YYYY')
        if(!checkDate(moment(moment().toDate()).format('DD/MM/YYYY'), lastDateFrom, lastDateTo)){            
            let date = moment(lastDateTo, 'DD/MM/YYYY').add(28, 'day').toDate()
            let newDateTo = moment(date).format('DD/MM/YYYY')

            let plantFrom = numberToSerialNumber(sections[i].plants.split('-')[0])
            let plantTo = numberToSerialNumber(sections[i].plants.split('-')[1])

            let plants = await plantCollection.find({ 'serialNumber': { $gte: plantFrom, $lte: plantTo } })

            let averageWidth = 0
            let averageHeight = 0
            let averageNumberFruits = 0
            let averageSP = 0
            let averageCP = 0

            for(let j = 0; j < plants.length; j++){
                averageWidth += plants[j].width
                averageHeight += plants[j].height
                averageNumberFruits += plants[j].numberFruits
                if(plants[j].statusReported){ averageCP++ }
                else{ averageSP++ }
            }

            sections[i].lastPeriod.width = averageWidth / plants.length
            sections[i].lastPeriod.height = averageHeight / plants.length
            sections[i].lastPeriod.numberFruits = averageNumberFruits / plants.length
            sections[i].lastPeriod.withoutPlague = averageSP 
            sections[i].lastPeriod.withPlague = averageCP
            sections[i].checkDateFrom = lastDateTo
            sections[i].checkDateTo = newDateTo
            sections[i].finishRead = false
            sections[i].save()
            
        }
    }
});

//const jobKeepAwake = new CronJob('0 */20 * * * *', () => {
  //  axios.get(`https://kaffeeqrapp.herokuapp.com`)
    //    .then((res) => {
      //  }).catch((e) => console.log(e))
//});

//jobKeepAwake.start()
jobCheckEmployeeDone.start()
jobCheckSectionDone.start()
jobCheckDate.start()
jobCheckChat.start()
jobGetWeather.start()