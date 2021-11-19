const jwt = require('jsonwebtoken');

function tokenValidation(req, res, next){    
    if(req.headers['authorization']){        
        let header = req.headers['authorization']
        let headerToken = header.split(' ')
        if(headerToken[0] === process.env.TOKEN_HEADER){            
            let token = headerToken[1] 
            jwt.verify(token, process.env.JWT_SEED, (err) => {
                if(err){
                    return res.sendStatus(403)
                }
                next()
            })
        }
        else{ res.sendStatus(403) }
    }else{        
        res.sendStatus(403)
    }
}

module.exports = tokenValidation;