// BASE SETUP
// ======================================

// CALL THE PACKAGES --------------------
var express    = require('express');		// call express
var app        = express(); 				// define our app using express
var bodyParser = require('body-parser'); 	// get body-parser
var morgan     = require('morgan'); 		// used to see requests
var mongoose   = require('mongoose');
var port       = process.env.PORT || 5022; // set the port for our app
var jwt 	   = require('jsonwebtoken');
var fs		   = require('fs');
var distance   = require('google-distance');

// super secret for creating tokens
var superSecret = 'outdoorssecretisthatitisasecret';

// APP CONFIGURATION ---------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));


// configure our app to handle CORS requests
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
	next();
});

///cloudinary config 
var cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'akashcloudinary', // account name on cloudinary  
  api_key: '884313855862948', // key and secret in the cloudinary account (security tab)
  api_secret: '5nICPtSmupbVKuGuOdFNvNAfGK8' 
});




// log all requests to the console
app.use(morgan('dev'));

// connect to our database 
mongoose.connect('mongodb://akash1234:8586882063@ds161304.mlab.com:61304/outdoors');

// ROUTES FOR OUR API
// ======================================
require('./app/routes')(app,mongoose,jwt,express,superSecret,cloudinary,fs,distance);


// START THE SERVER
// =============================================================================
app.listen(port);
console.log('The app runs on port ' + port);
