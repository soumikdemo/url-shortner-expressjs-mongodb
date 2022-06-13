require('dotenv').config();
const express = require('express');
const path = require('path');
const dns = require('dns');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const nanoid = require('nanoid');


//getting commands/url from terminal
/* const { platform } = require('os');
const { exec } = require('child_process');
const WINDOWS_PLATFORM = 'win32';
const MAC_PLATFORM = 'darwin';
const osPlatform = platform();
const args = process.argv.slice(2);                             
const [url] = args;
if (url === undefined) {
    console.error('Please enter a URL!');
    process.exit(0);
} */



//config
const app = express();
app.use(express.static(path.join(__dirname, 'public')));        //handling access to static files
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//const host = '0.0.0.0' || '127.0.0.1';                        //0.0.0.0 for heroku
app.set('port', process.env.PORT || 4100);

const server = app.listen(app.get('port'), () => {              //host address is skipped
    console.log(`Express Server running...`);

    /* let url = `http://${server.address().address}:${server.address().port}`;
    console.log(`Listening at → ${url}`);
    let command;
    if (osPlatform === WINDOWS_PLATFORM) {command = `start chrome ${url}`;} 
    else if (osPlatform === MAC_PLATFORM) {command = `open -a "Google Chrome" ${url}`;} 
    else {command = `google-chrome ${url}`;} 
    //opening url on the browser
    console.log(`executing command, OS: [${command}, ${osPlatform}]`);
    exec(command); */
});



//db config
const databaseUrl = process.env.DATABASE;
MongoClient.connect(databaseUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => { app.locals.db = client.db('shortener'); })
  .catch(() => console.error('Failed to connect to the database'));

const shortenURL = (db, url) => {
    const shortenedURLs = db.collection('shortenedURLs');
    return shortenedURLs.findOneAndUpdate(
        { 
            original_url: url 
        },
        {
            $setOnInsert: {
                original_url: url,
                short_id: nanoid(7),
            },
        },
        {
            returnOriginal: false,
            upsert: true,
        }
    );
};


//routes
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(htmlPath);
});

app.post('/new', (req, res) => {
    let originalUrl;

    try {
        originalUrl = new URL(req.body.url);
        console.log(originalUrl);
    } catch (err) {
        return res.status(400).send({ error: 'invalid URL' });
    }

    dns.lookup(originalUrl.hostname, (err, address, family) => {
        if (err) {
            console.log("errno:", err.errno, ", code:", err.code);
            return res.status(404).send({ error: 'Address not found' });
        };
        console.log('address: %j family: IPv%s', address, family);
        const { db } = req.app.locals;
        shortenURL(db, originalUrl.href)
            .then(result => {
                const doc = result.value;
                res.json({
                    original_url: doc.original_url,
                    short_id: doc.short_id,
                });
            })
            .catch(console.error);
    });
});

app.get('/:short_id', (req, res) => {
    const shortId = req.params.short_id;
    const { db } = req.app.locals;

    checkIfShortIdExists(db, shortId)
        .then(doc => {
            //if found, document can be accessed through 'doc'
            if(doc === null) return res.send("We could not find a link at that URL!");
            
            res.redirect(doc.original_url);
        })
        .catch(console.error);
  });

const checkIfShortIdExists = (db, code) => db.collection('shortenedURLs').findOne({ short_id: code });  
 
