const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const db = require(__dirname + "/db");
const multer = require("multer");
let fs = require('fs-extra');
const _ = require('lodash');
const video = require(__dirname + "/video");
const rimraf = require("rimraf");
const path = require("path");
const reports = require(__dirname + "/reports");



const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use("/reports", reports);

app.use(session({
  secret: "thisIsOurLittleSecret",
  resave: false,
  saveUninitialized: true
}));


app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb://localhost:27017/lmsDB");


const userSchema = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId
  },
  enrolledCoursesId: [],
  name: String,
  username:String,
  password: String,
  o6uId:Number,
  secret: String,
  active: Boolean,
  admin: Boolean
});

userSchema.plugin(passportLocalMongoose, {
    // Set usernameUnique to false to avoid a mongodb index on the username column!
    usernameUnique: false,

    findByUsername: function(model, queryParameters) {
    // Add additional query parameter - AND condition - active: true
    queryParameters.active = true;
    return model.findOne(queryParameters);
  }
});

userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://localhost:5000/auth/google/secrets",
//     userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_APP_ID,
//     clientSecret: process.env.FACEBOOK_APP_SECRET,
//     callbackURL: "http://localhost:5000/auth/facebook/secrets"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     console.log(profile);
//     User.findOrCreate({ facebookId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folderName = req.body.folderName;
    let path = `./uploads/${req.params.categoryName}/${req.params.courseName}/${folderName}`;
    fs.mkdirsSync(path);
    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });
const multipleFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'data', maxCount: 15 }]);
var arrayData = [];
var folderNames = [];

app.get("/create", (req, res) => {
  res.render("courseInfo");
});

app.post("/create", (req,res) => {
  let folderNumbers = req.body.folderNumbers;


  res.redirect(`upload/${req.body.categoryName}/${req.body.courseName}/${folderNumbers}`);
});

app.get("/upload/:categoryName/:courseName/:folderNumbers", (req, res) => {

  res.render("upload", {folderNumbers: req.params.folderNumbers,
                        categoryName:req.params.categoryName,
                        courseName: req.params.courseName});

});

app.post("/upload/:categoryName/:courseName/:folderNumbers", multipleFields, (req, res) => {



  let i = req.params.folderNumbers - 1;

  console.log(req.body.folderName);
  folderNames.push(req.body.folderName);
  // console.log(req.files["image"][0]);
  console.log(req.files["data"]);
  arrayData.push(req.files["data"]);

 if(i !== 0) {
    res.redirect(`/upload/${req.params.categoryName}/${req.params.courseName}/${i}`);
 } else {


  db.Category.findOne({categoryName: req.params.categoryName}, (err, category) => {
    if(!err) {
      if(category) {
        let newNumber = category.numberOfCourses + 1;
        db.Category.findOneAndUpdate(category, {numberOfCourses: newNumber}, {new:true}, (err) => {
          if(!err) {
            console.log("Category Updated Successfully");
          } else {
            console.log(err);
          }
        });
      } else {
        const newCategory = new db.Category({
  
          categoryName: req.params.categoryName,
          numberOfCourses: 1,
        
        });
      
        newCategory.save();
      }
    } else {
      console.log(err);
    }
  });

  

   const newCourse = new db.Courses({
     courseName: req.params.courseName,
     categoryName: req.params.categoryName,
     courseData: arrayData,
     folderNames:folderNames
   });

   newCourse.save(function(err) {
     if (!err) {
       console.log("Succesfully added a new Course");
     } else {
       res.send(err);
     }
   });
   res.redirect(`/CompleteInformation/${req.params.courseName}`);
 }


});

app.get("/CompleteInformation/:courseName", (req, res) => {

  res.render("CompleteInformation");
});
app.post("/CompleteInformation/:courseName", (req, res) => {

  let update = {
  instructorName: req.body.instructorName,
  courseDescription: req.body.courseDescription,
  courseLevel: req.body.courseLevel,
	priceCourse: req.body.price,
	duration: req.body.duration,
  }

  db.Courses.findOneAndUpdate({courseName: req.params.courseName}, update, {new:true}, (err) => {
    if(!err) {
      console.log("Course is Added Successfully");
      res.redirect("/");
    } else {
      console.log(err);
    }
  });
});

app.get("/delete", (req, res) => {

  db.Courses.find({}, (err, allCourses) => {
    if(!err) {
      res.render("delete", {courses: allCourses});
    } else {
      console.log(err);
    }
  });

});
app.get("/delete/:categoryName/:courseName/:courseId", async (req, res) => {
  
  let coursePath = "uploads/" + req.params.categoryName + "/"
                              + req.params.courseName;
  const pathToDir = path.join(__dirname, coursePath);

  rimraf(pathToDir, () => { console.log("Directory is removed Successfully"); });
  await db.Courses.deleteOne({_id: req.params.courseId});
  res.redirect("/delete");
});

app.get("/options", (req, res) => {
  res.render("deleteandupload");
});

  app.get("/profile", (req, res) => {

    if(req.isAuthenticated()) {
      let user = req.user;
      let coursesId = user.enrolledCoursesId;
      console.log(coursesId);
  
        db.Courses.find({_id:coursesId}, (err,course) => {
          if(!err) {
            console.log(course);
            if (req.user.o6uId) {

              res.render("profile", {courses: course, sessionIsActive: true, admin: req.user.admin, o6u: true});
              
            } else {
              res.render("profile", {courses: course, sessionIsActive: true, admin: req.user.admin, o6u: false});
            }
            
          } else {
            console.log(err);
          }
        });
      
    } else {
      res.redirect("/SignIn");
    }
    
  });

  app.route("/O6UCourses")
  .get((req, res) => {
    if(req.isAuthenticated()) {
      if (req.user.o6uId) {

        res.render("O6UCourses", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("O6UCourses", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }

    } else {
      
      res.render("O6UCourses", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });
  

  app.route("/payment/:courseId")
  .get((req, res) => {

    if(req.isAuthenticated())
      {
        console.log("User is authenticated");
        if (req.user.o6uId) {

          res.render("payment", {sessionIsActive: true, admin: req.user.admin, o6u: true});
          
        } else {
          res.render("payment", {sessionIsActive: true, admin: req.user.admin, o6u: false});
        }
        
      } else {
        res.redirect("/Signin");
      }
    
  })
  .post((req, res) => {
    let id = req.session.passport.user;
    let courseId = req.params.courseId;

    const newTransactions = new db.Transactions({
      paymentInfo: {
        visaName: req.body.name,
        visaNum: req.body.number,
        expireDate: req.body.date,
        cvv: req.body.cvv
      },
      studentId: id,
      courseId: courseId,
    });
    newTransactions.save();

    

    db.Courses.findById(courseId, (err, course) => {
      if(!err) {
        const newCourseReport = new db.Reports({

          courseReport: {
            courseCategory: course.categoryName,
            courseName: course.courseName,
            hasEnrolled: true,
            user: {
              email: req.user.username,
              userName: req.user.name
            },
            EnrolledDate: Date.now(),
          }
        
        });
        newCourseReport.save();
        let arr = course.usersEnrolled;
        arr.push(req.user.username);
        db.Courses.findByIdAndUpdate(courseId, {usersEnrolled: arr}, {new: true} , (err) => {
          if(!err) {
            console.log("Course is Updated Successfully");
          } else {
            console.log(err);
          }
        });
    

      } else {
        console.log(err);
      }
    });


    User.findById(id, (err, user) => {
      if(!err) {
        let arr = user.enrolledCoursesId;
        arr.push(courseId);
        User.findByIdAndUpdate(id, {enrolledCoursesId: arr}, {new: true} , (err) => {
          if(!err) {
            console.log("User is Updated Successfully");
            res.redirect("/profile");
          } else {
            console.log(err);
          }
        });
    

      } else {
        console.log(err);
      }
    });

    
  });
app.route("/")
  .get((req, res) => {

    // console.log(db.Courses.find({}));
    
    if(req.isAuthenticated()) {
      if (req.user.o6uId) {

        res.render("Home", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Home", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
      
    } else {
      
      res.render("Home", {sessionIsActive: false, admin: false, o6u: false});
    }
    
    
      
    
    // res.render("Home");
    
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam El Ansary</h1");
  });
app.route("/Categories")
  .get((req, res) => {
    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("Categories", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Categories", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("Categories", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });
app.route("/courses")
  .get((req, res) => {

    const object = "object";
    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("courses", {object:object, sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("courses", {object: object, sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("courses", {object: object, sessionIsActive: false, admin: false, o6u: false});
    }
   
  })
  .post((req, res) => {

    res.send("<h1>Hossam</h1");
  });
app.route("/About")
  .get((req, res) => {

    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("About", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("About", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("About", {sessionIsActive: false, admin: false, o6u: false});
    }
   
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });
app.route("/Contact")
  .get((req, res) => {
    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("Contact", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Contact", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("Contact", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {

    const newContact = new db.Contact({
      email: req.body.email,
    	userName: req.body.name,
    	subject: req.body.subject,
    	message: req.body.message
    });

    newContact.save(function(err) {
      if (!err) {
        res.send("Successfully add a new User");
      } else {
        res.send(err);
      }
    });
  });
app.route("/Journal")
  .get((req, res) => {

    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("Journal", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Journal", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("Journal", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });
app.route("/Pricing")
  .get((req, res) => {
    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("Pricing", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Pricing", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("Pricing", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });

         ////////////Login Section/////////////////

app.route("/SignIn")
  .get((req, res) => {
    
    res.render("SignIn", {sessionIsActive: false, admin: false, o6u: false});
  })
  .post((req, res) => {

    const user = new User({
      username: req.body.username,
      password: req.body.password
    });

    console.log(user);

    req.login(user, function(err) {
      if (err) { return next(err); }
      else {
        console.log(req.body);
        passport.authenticate("local", { failureRedirect: '/SignIn'})(req, res, function(){
          res.redirect("/");
        });
      }
      
    });

  });
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

     ////////////Register Section/////////////////

app.route("/SignUp")
  .get((req, res) => {
    res.render("SignUp", {sessionIsActive: false, admin: false, o6u: false});
  })
  .post((req, res) => {

    if(req.body.pass !== req.body.re_pass) {
      res.redirect("/SignUp");
    } else {

      if(req.body.o6u) {

        db.O6u.findOne({o6uId: req.body.o6u}, (err, o6u) => {
          if(!err) {

            if(o6u) {
              User.register({username: req.body.email, active: true, name: req.body.name, admin: false, o6uId: o6u.o6uId}, req.body.pass, function(err, user){
                if (err) {
                  console.log(err);
                  res.redirect("/SignUp");
                } else {
                  
                  const newUserReport = new db.Reports({

                    userReport: {
                      email: req.body.email,
                      userName: req.body.name,
                      hasRegistered: true,
                      RegisterationDate: Date.now()
                    }
                  
                  });
                  newUserReport.save();

                  const authenticate = User.authenticate();
                  authenticate(req.body.email, req.body.pass, function(err, result) {
                  if (err) { res.redirect("/SignUp");}
                  else {res.redirect("/SignIn");}
                   // Value 'result' is set to false. The user could not be authenticated since the user is not active
                  
                  });
          
                  // passport.authenticate("local")(req, res, function(){
                  //   res.redirect("/SignIn");
                  // });
                }
              });
            } else {
              res.redirect("/SignUp")
            }
            
          } else {
            console.log(err);
          }
        });
        
      } else {


        User.register({username: req.body.email, active: true, name: req.body.name, admin: false}, req.body.pass, function(err, user){
          if (err) {
            console.log(err);
            res.redirect("/SignUp");
          } else {

            const newUserReport = new db.Reports({

              userReport: {
                email: req.body.email,
                userName: req.body.name,
                hasRegistered: true,
                RegisterationDate: Date.now()
              }
            
            });
            newUserReport.save();
    
            const authenticate = User.authenticate();
            authenticate(req.body.email, req.body.pass, function(err, result) {
            if (err) { res.redirect("/SignUp");}
            else {res.redirect("/SignIn");}
             // Value 'result' is set to false. The user could not be authenticated since the user is not active
            
            });
    
            // passport.authenticate("local")(req, res, function(){
            //   res.redirect("/SignIn");
            // });
          }
        });
      }
     

      
  

    }

    
  });


app.route("/Team")
  .get((req, res) => {
    if(req.isAuthenticated()) {
      
      if (req.user.o6uId) {

        res.render("Team", {sessionIsActive: true, admin: req.user.admin, o6u: true});
        
      } else {
        res.render("Team", {sessionIsActive: true, admin: req.user.admin, o6u: false});
      }
    } else {
      
      res.render("Team", {sessionIsActive: false, admin: false, o6u: false});
    }
    
  })
  .post((req, res) => {
    res.send("<h1>Hossam</h1");
  });

//            Categories Section
app.get("/:categoryName", (req, res) => {

  const category = req.params.categoryName;
  category.replace(/\s+/g, '');
  console.log(category);
  let page = true;
  if(category !== "Marketing" && 
     category !== "UI-UX Design" &&
     category !== "Art & Design" &&
     category !== "Computer Science" &&
     category !== "Information Software" &&
     category !== "Music" &&
     category !== "Business" &&
     category !== "Graphic Design" &&
     category !== "Software Engineering" &&
     category !== "Health & Fitness") {
    page = false;
  }
  if (page) {

    db.Courses.find({categoryName: category}, function(err, foundCourse){
      if(!err) {
        if(foundCourse) {
          console.log(foundCourse);
          if(req.isAuthenticated()) {
            if (req.user.o6uId) {

              res.render("courses", {object: category, foundCourse: foundCourse, sessionIsActive: true, admin: req.user.admin, o6u: true});
              
            } else {
              res.render("courses", {object: category, foundCourse: foundCourse, sessionIsActive: true, admin: req.user.admin, o6u: false});
            }
            
          } else {
            
            res.render("courses" , {object: category, foundCourse: foundCourse, sessionIsActive: false, admin: false, o6u: false});
          }
          
        } else {
          console.log("not Found");
          res.redirect("/courses");
        }
      } else {
        console.log(err);
        res.redirect("/courses");
      }
    });
    
  } 
  

});

app.get("/courseway/:courseName", (req, res) => {

  res.render("courseway", {courseName: req.params.courseName});

});
app.post("/courseway/:courseName", (req, res) => {
  if(req.body.categories === "online") {

    res.redirect(`/aboutCourse/${req.params.courseName}`);

  } else {
    res.render("schdule");
  }
});
app.post("/schdule", (req, res) => {

  const offline = new db.Offline({
  name: req.body.name,
	surname: req.body.surname,
	mobileNumber: req.body.mobileNumber,
  address: req.body.address,
  email: req.body.email,
	education: req.body.education,
	country: req.body.country,
  state: req.body.state,
  day: req.body.day,
  time: req.body.time,
  });

  offline.save(function(err) {
    if (!err) {
      console.log("Succesfully added a new Course");
    } else {
      res.send(err);
    }
  });
  res.redirect("/");


});

app.get("/viewCourse/:courseName", (req, res) => {

  let courseName = req.params.courseName;
  db.Courses.findOne({courseName: courseName}, (err, course) => {
    if(!err) {
      if(course) {
        console.log(course);
        if(req.isAuthenticated()) {
          console.log(req.user);
          if (req.user.o6uId) {

            res.render("viewcourse", {course: course,sessionIsActive: true, admin: req.user.admin, o6u: true});
            
          } else {
            res.render("viewcourse", {course: course,sessionIsActive: true, admin: req.user.admin, o6u: false});
          }
      
        } else {
          
          res.render("viewcourse", {course: course, sessionIsActive:false, admin: false, o6u: false});
        }
        
      }
    } else {
      console.log(err);
      res.redirect("/");
    }
  });

 
});

app.get("/aboutCourse/:courseName", (req, res) => {

  let courseName = req.params.courseName;
  db.Courses.findOne({courseName: courseName}, (err, course) => {
    if(!err) {
      if(course) {
        console.log(course);
        if(req.isAuthenticated()) {
          console.log(req.user);

          if (req.user.o6uId) {

            res.render("courseDetails", {course:course, sessionIsActive: true, admin: req.user.admin, o6u: true});
            
          } else {
            res.render("courseDetails", {course: course, sessionIsActive: true, admin: req.user.admin, o6u: false});
          }
      
        } else {
          
          res.render("courseDetails", {course: course, sessionIsActive:false, admin: false, o6u: false});
        }
        
      }
    } else {
      console.log(err);
      res.redirect("/");
    }
  });

 
});

app.get("/video/:categoryName/:courseName/:folderName/:filename", (req, res) => {
  
  let categoryName = req.params.categoryName;
  let courseName = req.params.courseName;
  let folderName = req.params.folderName;
  let filename = req.params.filename;
  // folderName = folderName.replace(" ", "");
  let path = "./uploads/"
              + categoryName + "/"
              + courseName  + "/"
              + folderName + "/"
              + filename;

 video.stream(req, res, path);
 
  
});



app.listen(5000, function(){
  console.log("server running on port 5000");
});
