const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');


//config
const app = express();
app.use(express.static(path.join(__dirname, 'public')));        //handling access to static files
app.use(bodyParser.json());
app.set('port', process.env.PORT || 4100);
const server = app.listen(app.get('port'), () => {
    console.log(`Express running → PORT ${server.address().port}`);
});

//routes
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(htmlPath);
});
app.post('/new', (req, res) => {
    console.log(req.body);
});



