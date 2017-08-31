'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = process.env.PORT || 5000;

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/bookmarks', {useMongoClient: true})
	.then(() => {
    	console.log('La conexión a MongoDB se ha realizado correctamente!!');
        app.listen(port, () => {
        console.log('El servidor esta corriendo');
        });
    })
    .catch(err => console.log(err));
