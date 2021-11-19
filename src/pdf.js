const pdf = require('html-pdf');
const path = require('path')
const Jimp = require('jimp');


const createPDF = async (name, total, kg, date, sign, photo, callback) => {

    let pathFontSemibold = path.resolve(__dirname, './assets/fonts/Montserrat-SemiBold.otf')
    pathFontSemibold = pathFontSemibold.replace(/\\/g, '/')

    let pathFontLight= path.resolve(__dirname, './assets/fonts/Montserrat-Light.otf')
    pathFontLight = pathFontLight.replace(/\\/g, '/')

    let base64photo = Buffer.from(photo).toString('base64')
    let signImage = await Jimp.read(sign)
    let base64Sign = await signImage.rotate(90).getBase64Async(Jimp.MIME_JPEG)

    const html = `
        <style>
            @font-face{
                font-family: Montserrat-Light;
                src: url(file:///${pathFontLight});
            }
            @font-face{
                font-family: Montserrat-SemiBold;
                src: url(file:///${pathFontSemibold});
            }
        </style>
        <div style="display: flex">
            <h1 style="text-align: center; font-size: 12; margin-top: 1.5rem; color: rgb(91, 0, 104); font-family: Montserrat-SemiBold; margin-bottom: 0" >KAFFEE</h1>
            <h2 style="text-align: center;  font-size: 8; margin-top: 0; font-family: Montserrat-Light; margin-bottom: 0;" >RANCHO AGRÍCOLA LA GAVIA</h2>
            <h3 style="text-align: center;  font-size: 10; margin-top: 0; font-family: Montserrat-SemiBold; margin-top: 0;" >COMPRA HIGO</h3>
        </div>
        <div style="display: flex">
            <img src="data:image/jpeg;base64,${base64photo}" style="height: 5rem; width: 5rem; margin: 0 auto; display: block"/>
            <div style="width: 5rem; height: 0.5rem; margin: 0 auto; background-color: black;">
                <p style="text-align: center; font-size: 5; width: 5rem; color: white; margin: auto 0; font-family: Montserrat-Light">Fecha ${date}</p>
            </div>
        </div>
        <div style="display: flex"> 
            <img src="${base64Sign}" style="height: 50px; width: 100px; border: 1px solid white; margin: 0 auto; display: block"/>
        </div>
        <div style="display: flex; background-color: rgb(0, 60, 0); width: 100%; height: 3.5rem; "> 
            <div style="padding: 0.75rem 0">
                <p style="text-align: center; font-size: 5;color: white; font-family: Montserrat-Light; margin: 0; height: 0.5rem">Nombre: ${name}</p>
                <p style="text-align: center; font-size: 5;color: white; font-family: Montserrat-Light; margin: 0; height: 0.5rem">No. Kilo: ${kg}</p>
                <p style="text-align: center; font-size: 5;color: white; font-family: Montserrat-Light; margin: 0; height: 0.5rem">Pago Total: ${total}</p>
                <p style="text-align: center; font-size: 5;color: white; font-family: Montserrat-Light; margin: 0; height: 0.5rem">ID: ${Date.now()}</p>
            </div>
        </div>              
    `

    const options = {
        height: "10cm",       
        width: "5cm", 
        footer:{ height: "0cm" },
        phantomArgs: ['--local-url-access=false']
    }

    pdf.create(html, options).toBuffer((err, buf) => { callback(err, { doc: buf, date }) })
}

module.exports = {
    createPDF
}