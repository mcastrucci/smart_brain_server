const express = require('express');
const body_parser = require ('body-parser');
const bcrypt = require ('bcrypt-nodejs');
const cors = require ('cors');
const knex = require ('knex');

const db = knex({
    client: 'pg',
    connection: {
        ssl: true,
        connectionString: process.env.DATABASE_URL
    }
});


const app = express ();

app.use (body_parser.json());
app.use(cors());

const id = 0;

app.get('/',(req, res) => {
    /*db.select('*').from('users')
        .then(users =>{
            if (users.length)
                return res.json(users);
            else
                sendNotFoundResponse('no users on the DB', res);  
        }) 
        .catch(err => {
            console.log(err);
            sendNotFoundResponse('unable to fetch users', res);
        })*/
        return res.json('App is running')
})


app.get('/profile/:email', (req,res) =>{
    const { email } = req.params;
    console.log(email);
    db.select('*').from('users').where('email', '=', email)
        .then(queryResult => {
            if(queryResult.length)
                res.json(queryResult[0]);
            else
                return sendNotFoundResponse('user not found', res);
        });
})

app.post('/signin', (req,res) => {
    db.select('email', 'hash').from('login')
        .where('email', req.body.email)
            .then(user => {
                if (user.length){
                    console.log(req.body.pass, user[0].hash);
                    if(bcrypt.compareSync(req.body.pass, user[0].hash)){
                        console.log('pass is correct');
                        return db.select('*').from('users').where('email', req.body.email)
                            .then(data =>{
                                if (data.length)
                                    return res.json(data[0]);
                                else
                                    return sendNotFoundResponse('Invalid password or user', res);
                            })
                    }else{
                        return sendNotFoundResponse('Invalid password or user', res);
                    }
                }else
                    return sendNotFoundResponse('unable to signin', res);
            })
            .catch(err => {
                console.log(err);
                return sendNotFoundResponse('unable to signin', res);
            })

})

app.put('/image', (req,res) => {
    const { email } = req.body;
    db('users')
        .where('email', '=', email)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            if(entries.length)
                res.json(entries[0]);
            else
                sendNotFoundResponse('Entries not found', res);
        })
})

isInputEmpty = (input) =>{
    if (input === undefined || input.length === 0)
        return true;
    else
        return false;
}

sendNotFoundResponse = (text, res) => {
    return res.status(404).json(text);
}

app.post('/register', (req,res) =>{
    let { name, pass, email } = req.body;
    let userExists, emailExists;

    const hash = bcrypt.hashSync(pass);

    if(isInputEmpty(name) || isInputEmpty(pass) || isInputEmpty(email) || isInputEmpty(name)){
        console.log(name, email, pass);
        return sendNotFoundResponse('please, complete all inputs', res);
    }

    console.log('starting to input user')
    db.transaction(trx => {
        console.log('transaction starts')
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail =>{
            console.log('now adding into users')
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0],
                name: name,
                joined: new Date()
            })
            .then (user =>{
                res.json(user[0]);
            })
        })    
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(ex => {
        return sendNotFoundResponse('cannot register', res);
    })

        

})
 
app.listen(process.env.PORT || 3000, () =>{
    console.log(`app is running on port ${process.env.PORT || 3000}`);
});