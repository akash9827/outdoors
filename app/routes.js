var User = require('config/models/user');
var Arena = require('config/models/Arena');
var Fixture = require('config/models/fixture');
var ArenaPhoto = require('config/models/arenaPhoto');
var Sport = require('config/models/sport');

/// NOTE --- PLAYTIME is a number for now, change it to datetime,, for ranged date querry(in getArena) -- url -- "https://stackoverflow.com/questions/2943222/find-objects-between-two-dates-mongodb"
// date comparisions url -- "https://stackoverflow.com/questions/37458738/mongodb-date-comparison-issues"
module.exports = function(app, mongoose, jwt, express, superSecret, cloudinary, fs, distance) {


 app.get('/', function(req, res) {
  res.send('Welcome to OUTDOORS');


 });

 app.get('/testLatest', function(req, res) {
  arenaid = mongoose.Types.ObjectId('59e988996c8334b4058e00f8')
  Fixture.aggregate([{
    "$match": {
     arena: arenaid
    }
   }, {
    "$group": {
     _id: "$arena",
     minPlayTime: {
      $min: "$playTime"
     }
    }
   }



  ], function(err, fixtures) {
   fixtures.forEach(function(item) {
    console.log(item);

   })

  })



 })




 app.post('/addSport', function(req, res) {

  var sportName = req.body.sportName;
  var sport = new Sport();

  sport.name = sportName;
  sport.save(function(err) {
   if (err)
    res.json({
     "success": false,
     "message": err
    });

   res.json({
    "success": true,
    "message": "New sport category added"
   });
  });


 });





 var apiRouter = express.Router();

 apiRouter.post('/register', function(req, res) {

  var user = new User(); // create a new instance of the User model
  user.name = req.body.name; // set the users name (comes from the request)
  user.username = req.body.username; // set the users username (comes from the request)
  user.password = req.body.password; // set the users password (comes from the request)
  user.preferedSport = Array.from(req.body.preferedSport);






  user.save(function(err) {
   if (err) {
    // duplicate entry
    if (err.code == 11000)
     return res.json({
      success: false,
      message: 'A user with that username already exists. '
     });
    else
     return res.send(err);
   }

   // return a message
   res.json({
    message: 'User created!'
   });
  });
 });

 apiRouter.post('/login', function(req, res) {

  User.findOne({
   username: req.body.username
  }).select('name username password').exec(function(err, user) {

   if (err) throw err;

   // no user with that username was found
   if (!user) {
    res.json({
     success: false,
     message: 'Authentication failed. User not found.'
    });
   } else if (user) {

    // check if password matches
    var validPassword = user.comparePassword(req.body.password);
    if (!validPassword) {
     res.json({
      success: false,
      message: 'Authentication failed. Wrong password.'
     });
    } else {

     // if user is found and password is right
     // create a token
     var token = jwt.sign({
      name: user.name,
      username: user.username
     }, superSecret, {
      expiresIn: '24h' // expires in 24 hours
     });

     // return the information including token as JSON
     res.json({
      success: true,
      message: 'Enjoy your token and id!',
      token: token,
      id: user.id
     });
    }

   }

  });
 });

 // route middleware to verify a token
 apiRouter.use(function(req, res, next) {
  // do logging
  console.log('Somebody just came to our app!');

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

   // verifies secret and checks exp
   jwt.verify(token, superSecret, function(err, decoded) {
    if (err) {
     return res.json({
      success: false,
      message: 'Failed to authenticate token.'
     });
    } else {
     // if everything is good, save to request for use in other routes


     req.decoded = decoded;

     next(); // make sure we go to the next routes and don't stop here
    }
   });

  } else {

   // if there is no token
   // return an HTTP response of 403 (access forbidden) and an error message
   return res.status(403).send({
    success: false,
    message: 'No token provided.'
   });

  }
 });

 // test route to make sure everything is working
 apiRouter.get('/', function(req, res) {
  res.json({
   message: 'hooray! welcome to authenticated api!'
  });
 });



 ///////////////////////////////// ADD //////////////////////////////////////////////////////////////////////////
 //create event
 apiRouter.post('/addfixture', function(req, res) {

  var name = req.body.name;
  /*
  var description= req.body.description;
  var sportId= req.body.sportId;
  */
  var sport = req.body.sport;
  var playTime = req.body.playTime; // new Date(playTime); and then mongo wraps date object into ISO automatically
  var arenaId = req.body.arenaId;

  if (!sport || !playTime || !arenaId) {
   res.json({
    "success": false,
    "message": "Please fill the required fields"
   });
  } else {
   // considering 2 hours for each fixture
   // for a new fixture's playTime there should be no fixture within upp and low Bound
   var playTimeLowBound = playTime - 2;
   var playTimeUppBound = playTime + 2;

   Fixture.find({
    "$and": [{
     "arena": arenaId
    }, {
     "playTime": {
      "$gt": playTimeLowBound,
      "$lt": playTimeUppBound
     }
    }]
   }, function(err, inBound) {


    if (inBound.length != 0) {
     res.json({
      "success": false,
      "message": "Fixture to be added is within the existing fixtures time bounds"
     })
    } else {


     Arena.findOne({
      _id: arenaId
     }, function(err, result) {
      var fixture = new Fixture();

      fixture.name = name;
      //fixture.description= description;
      fixture.sport = sport;
      fixture.playTime = playTime;
      fixture.arena = req.body.arenaId;

      fixture.location.coordinates = Array.from(result.location.coordinates);
      fixture.location.type = "Point";

      fixture.save(function(err, savedFixture) {
       if (err)
        res.json({
         "success": false,
         "message": err
        })
       else
        res.json({
         "success": true,
         "message": "New Fixture created " + savedFixture
        })
      })


     })


    }

   })


  }




 })

 apiRouter.post('/addArena', function(req, res) {

  //reqs
  /*
  name, description , location as array[long,lat], sports as array either sportsid or sport names decide!

  */
  //uncoment this when trying pictures
  //var arenaPhoto= Array.from(req.body.arenaPhoto);

  var name = req.body.name;
  var description = req.body.description;
  var arenaCoords = Array.from(req.body.location);

  if (!name || !description) {
   res.json({
    "success": false,
    "message": "Please fill all the credentials"
   });
  } else {

   Arena.find({
     $or: [

      {
       "location.coordinates": [arenaCoords[0], arenaCoords[1]]
      }, {
       "name": name
      }


     ]
    }


    ,
    function(err, exist) {
     if (err)
      res.send(err);
     if (exist.length === 0) {
      console.log("No such arena exists, so saved!");
      var arena = new Arena();

      arena.name = name;
      arena.description = description;

      //arena.custodian=  custodianId;
      arena.sportsNames = Array.from(req.body.arenaSportsNames);
      arena.location.type = "Point";
      arena.location.coordinates = Array.from(arenaCoords); // long first then lat



      arena.save(function(err, data) {
       if (err)
        res.json({
         'success': false,
         'error': err
        });
       else
        res.json({
         'success': true,
         'message': "Arena added",
         "arena": data
        });
       // image add procedure
       /*
								arenaPhoto.forEach(function(photo){
									var newArenaPhoto= new ArenaPhoto();
								
									newArenaPhoto.arena= data.id;

									newArenaPhoto.save(function(err,savedPhoto){
										// photo collection upload to cloudinary 
										var arenaPhotoPath= './public/'+savedPhoto.id+'.jpg';
										//save locally
										fs.writeFileSync(arenaPhotoPath, new buffer(savedPhoto));
										// send path of it to cloudinary
										cloudinary.uploader.upload(arenaPhotoPath,function(result)
										{
						  	 				res.json({"success":true,"result":data});

						  	 			},
						  	 			{ 
						  	 				public_id : savedPhoto.id
						  	 			} 
						  	 			
						  	 			);

									})

								
								})*/


      });

     } else {
      console.log("Arena with either same name or coordinates exists");
      res.json({
       "success": false,
       "message": "Arena with either same name or coordinates exists" + err
      });
     }
    })



  }



 });




 ///////////////////////////////////	GeoSPATIAL	GET 		//////////////////////////////////////////////////////////////////////

 apiRouter.post('/testLocation', function(req, res) {

  var source = req.body.source;
  var destination = req.body.destination;

  distance.get({
   origins: source,
   destination: destination
  }, function(err, distanceObject) {
   console.log(distanceObject);
  })


  //77.183140, 28.501280 chhatarpur
  //77.2082082, 28.5575181  gulmohar green park
  //28.5477106,77.1875826   nadala park (katwaria sarai )

 })



 apiRouter.post('/getFixture', function(req, res) {

  var userCoordinates = Array.from(req.body.userCoordinates);

  Fixture.aggregate([{
    "$geoNear": {
     "near": {
      "type": "Point",
      "coordinates": userCoordinates
     },
     "distanceField": "distance",
     "spherical": true,
     "maxDistance": 100000 // 10km
    }
   }

  ], function(err, nearfixture) {
   // push nearfixture
   var responseFixture = [];
   nearfixture.forEach(function(fixture) {

    responseFixture.push({
     "name": fixture.name,
     "fixtureId": fixture._id,
     "location": fixture.location.coordinates,
     "sport": fixture.sport,
     "playTime": fixture.playTime
    })

   })

   if (responseFixture.length === nearfixture.length) {
    // just change createdAt with playTime -- final
    res.json({
     "success": true,
     "message": "change the sorting from createdAt to playTime (backend)",
     "Response": responseFixture.sort(function(a, b) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
     })
    });


   }


  })



 })




 /// latest fixture with sort and limit method 
 apiRouter.post('/getArena', function(req, res) {

  var userCoordinates = Array.from(req.body.userCoordinates);
  console.log(userCoordinates + " ********** userLocation")



  Arena.aggregate(
   [{
     "$geoNear": {
      "near": {
       "type": "Point",
       "coordinates": userCoordinates
      },
      "distanceField": "distance",
      "spherical": true,
      "maxDistance": 20000 //20 kms
     }
    }

   ],
   function(err, nearArena) {
    var responseArena = [];

    nearArena.forEach(function(result) {
     var sports = Array.from(result.sportsNames);
     var querry = Fixture.find({
      arena: result._id
     }).sort({
      playTime: 1
     }).limit(1);
     // sort will also work when playTime becomes ISO , so do not change this route , perfect -- final
     querry.exec(function(err, q) {

      responseArena.push({
       "arenaId": result._id,
       "name": result.name,
       "sports": sports,
       "coordinates": result.location.coordinates,
       "latestFixture": {
        "fixtureId": q[0]._id,
        "sport": q[0].sport,
        "playTime": q[0].playTime
       }
      })
      if (responseArena.length === nearArena.length) {
       console.log("Response Arena ------------" + responseArena);
       res.json({
        "success": true,
        "response": responseArena
       });
      }


     })




    })


   })

 })






 // use _id instead of id in case of aggregate's callback
 // CAUTION FOR POSTMAN url- getArena2
 // working
 // drawbacks-- cannot get the id of the fixture :P :P :P :P 
 /// possible solution --- Fixture.find({arena:result._id}).sort(playTime:1).limit(1)
 apiRouter.post('/getArena2', function(req, res) {

  var userCoordinates = Array.from(req.body.userLocation);
  console.log(userCoordinates + " ********** userLocation")


  Arena.aggregate(
   [{
     "$geoNear": {
      "near": {
       "type": "Point",
       "coordinates": userCoordinates
      },
      "distanceField": "distance",
      "spherical": true,
      "maxDistance": 20000 //20 kms
     }
    }

   ],
   function(err, nearArena) {
    var responseArena = [];

    nearArena.forEach(function(result) {
      var sports = Array.from(result.sportsNames);
      // query -- fixture with arena= result._id +++++ latest playTime
      // grouping (based on arena) with min playTime -- 
      //  latest fixture for each arena , then match the returned fixture's arenaid with result._id 
      console.log("result._id " + result._id);
      var arenaid = mongoose.Types.ObjectId(result._id);
      Fixture.aggregate([{
        "$match": {
         arena: arenaid
        }
       },

       {
        "$group": {
         _id: "$arena",
         minPlayTime: {
          $min: "$playTime"
         }
        }
       }

      ], function(err, fixtures) {
       if (err)
        res.send(err);

       if (fixtures.length) {
        fixtures.forEach(function(fixture) {

         console.log("fixture ---" + fixture.minPlayTime);
         responseArena.push({
          "id": result._id,
          "name": result.name,
          "sports": sports,
          "latestFixture": {
           //"sport":fixture.sport,
           "playTime": fixture.minPlayTime
            //"fixtureId":fixture._id
          }
          // latest fixture------ sport type, and playTime
         })

        })


       } else {
        console.log("default");
        responseArena.push({
         "id": result._id,
         "name": result.name,
         "sports": sports,
         "latestFixture": null
        })
       }
       if (responseArena.length === nearArena.length) {
        console.log("Response Arena ------------" + responseArena);
        res.json(responseArena);
       }


      })



     })
     /*
     if(responseArena.length===nearArena.length){
     	console.log("Response Arena ------------"+responseArena);
     	res.json(responseArena);
     }
     */

   })

 })


 // use _id instead of id in case of aggregate's callback
 // working 100 original
 apiRouter.post('/getArena1', function(req, res) {

  var userCoordinates = Array.from(req.body.userLocation);
  console.log(userCoordinates + " ********** userLocation")


  Arena.aggregate(
   [{
     "$geoNear": {
      "near": {
       "type": "Point",
       "coordinates": userCoordinates
      },
      "distanceField": "distance",
      "spherical": true,
      "maxDistance": 20000 //20 kms
     }
    }

   ],
   function(err, nearArena) {
    var responseArena = [];

    nearArena.forEach(function(result) {
     var sports = Array.from(result.sportsNames);
     responseArena.push({
       "id": result._id,
       "name": result.name,
       "sports": sports,
       "latestFixture": null
      })
      // query -- fixture with arena= result._id +++++ latest playTime

    })

    if (responseArena.length === nearArena.length) {
     console.log("Response Arena ------------" + responseArena);
     res.json(responseArena);
    }
   })

 })

 //////////////////////////////////////////////////////////////////////////////////////////////////////////////
 /*

	// get all the users (accessed at GET http://localhost:8080/api/users)
	.get(function(req, res) {
		User.find(function(err, users) {
			if (err) res.send(err);

			// return the users
			res.json(users);
		});
	});

// on routes that end in /users/:user_id
// ----------------------------------------------------
apiRouter.route('/users/:user_id')

	// get the user with that id
	.get(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {
			if (err) res.send(err);

			// return that user
			res.json(user);
		});
	})

	// update the user with this id
	.put(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {

			if (err) res.send(err);

			// set the new user information if it exists in the request
			if (req.body.name) user.name = req.body.name;
			if (req.body.username) user.username = req.body.username;
			if (req.body.password) user.password = req.body.password;

			// save the user
			user.save(function(err) {
				if (err) res.send(err);

				// return a message
				res.json({ message: 'User updated!' });
			});

		});
	})

	// delete the user with this id
	.delete(function(req, res) {
		User.remove({
			_id: req.params.user_id
		}, function(err, user) {
			if (err) res.send(err);

			res.json({ message: 'Successfully deleted' });
		});
	});
	
	*/






 // api endpoint to get user information
 apiRouter.get('/me', function(req, res) {
  res.send(req.decoded);
 });

 // REGISTER OUR ROUTES -------------------------------
 app.use('/api', apiRouter);

}