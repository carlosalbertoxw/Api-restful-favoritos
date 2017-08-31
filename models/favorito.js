'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FavoriteSchema = Schema({
	title: String,
	description: String,
	url: String
});

module.exports = mongoose.model('Favorite', FavoriteSchema);
