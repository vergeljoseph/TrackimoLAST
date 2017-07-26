var express = require('express'),
	path = require('path'),
	bodyParser = require('body-parser'),
	cons = require('consolidate'),
	dust = require('dustjs-helpers'),
	app = express(),
    routes = require('./routes');

//Assign Dust Engine to .dust Files
app.engine('dust', cons.dust);
// app.engine('html', require('ejs').renderFile);

//Set Default Ext .dust
app.set('view engine', 'dust');
// app.set('view engine', 'html');
app.set('views', __dirname + '/views');

//Set Public Folder

app.use(express.static(path.join(__dirname, 'public')));


//Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

//routes
app.use('/', routes);

// Handle 404 - Keep this as a last route
app.use(function(req, res, next) {
    res.status(400);
    res.render('pagenotfound', {title: '404: File Not Found'});
});

module.exports = app;