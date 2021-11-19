const moment = require('moment');

const numberToSerialNumber = (number) => {
    let serialNumber = ''    
    if(parseInt(number) >= 0){ serialNumber = `0000${parseInt(number)}` }
    if(parseInt(number) >= 10){ serialNumber = `000${parseInt(number)}` }
    if(parseInt(number) >= 100){ serialNumber = `00${parseInt(number)}` }
    if(parseInt(number) >= 1000){ serialNumber = `0${parseInt(number)}` }
    if(parseInt(number) >= 10000){ serialNumber = `${parseInt(number)}` }
    return serialNumber
}

const numberToSerialNumberQR = (number) => {
    let serialNumber = ''    
    if(parseInt(number) >= 0){ serialNumber = `000${parseInt(number)}` }
    if(parseInt(number) >= 10){ serialNumber = `00${parseInt(number)}` }
    if(parseInt(number) >= 100){ serialNumber = `0${parseInt(number)}` }
    if(parseInt(number) >= 1000){ serialNumber = `${parseInt(number)}` }    
    return serialNumber
}

const checkDate = (date, checkFrom, checkTo) => {
    let datePLant = `${date.split('/')[2]}-${date.split('/')[1]}-${date.split('/')[0]}`
    let chechFromFormatted = `${checkFrom.split('/')[2]}-${checkFrom.split('/')[1]}-${checkFrom.split('/')[0]}`
    let chechToFormatted = `${checkTo.split('/')[2]}-${checkTo.split('/')[1]}-${checkTo.split('/')[0]}`
    return moment(datePLant).isBetween(chechFromFormatted,chechToFormatted)
}

const missingPlantsFormatted = (serialNumbers) => {
    let missingPLants = []
    let serialNumbersSorted = serialNumbers.sort( (a,b) => a - b ) 
    let initialValue = serialNumbersSorted[0]    
    let lastValue = ''
    for(let i = 0; i < serialNumbersSorted.length - 1; i++){
        if(parseInt(serialNumbersSorted[i+1]) == parseInt(serialNumbersSorted[i]) + 1){ 
            lastValue = serialNumbersSorted[i+1]
            if(i === serialNumbersSorted.length - 2){ missingPLants.push(`${initialValue}-${lastValue}`) } 
        }
        else{
            if(parseInt(serialNumbersSorted[i+1]) != parseInt(serialNumbersSorted[i+2]) - 1 && i !== serialNumbersSorted.length - 2){
                missingPLants.push(serialNumbersSorted[i+1])
                continue
            }
            if(lastValue === ""){ missingPLants.push(`${initialValue}`) }
            else{ missingPLants.push(`${initialValue}-${lastValue}`) }
            initialValue = serialNumbersSorted[i+1]
            if(i === serialNumbersSorted.length - 2){ missingPLants.push(initialValue) }
        }
    }
    return missingPLants.join('\n')
}

module.exports = {
    numberToSerialNumber,
    checkDate,
    missingPlantsFormatted,
    numberToSerialNumberQR
}