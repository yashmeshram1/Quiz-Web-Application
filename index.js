const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt"); // Corrected import statement
const collection = require("./config");
const crypto = require('crypto');
const questions = require('./questions.json');
const session = require('express-session');
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

app.use(express.static("public"));
const secretKey = crypto.randomBytes(64).toString('hex');

app.use(
  session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
  })
);

const mongoURI = 'mongodb+srv://yashmeshram239:Yash123@studentdetails.qf7rbm6.mongodb.net/?retryWrites=true&w=majority';

const dbName = 'Studentdetails';

app.get("/", (req, res) => {
    res.render("website");
});
app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/contactus', (req, res) => {
  res.render('contactus');
});

app.get('/ourteam', (req, res) => {
  res.render('ourteam');
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});


app.get('/login', (req, res) => {
  res.render('login');
});

app.get("/signup", (req, res) => {
    res.render("signup");
});
app.get("/home", (req, res) => {
  res.render("home");
});

app.post("/signup", async (req, res) => {
    const data = {
        registrationno: req.body.username,
        password: req.body.password,
        name: req.body.name,
        roll: req.body.roll,
        department: req.body.dept
    }

    try {
        const existingUser = await collection.findOne({ registrationno: data.registrationno });

        if (existingUser) {
            res.send("User already exists. Please choose a different username.");
        } else {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);
            data.password = hashedPassword;

            const userData = await collection.create(data); // Use create() to insert a single document
            console.log(userData);
            res.send("User registered successfully.");
        }
    } catch (error) {
        console.error(error);
        res.send("An error occurred during registration.");
    }
});

app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ registrationno: req.body.username });

        if (!check) {
            res.send("User not found");
        } else {
            const isPasswordMatch = await bcrypt.compare(
                req.body.password,
                check.password
            );

            if (isPasswordMatch) {
              res.render("dashboard", { name: check.name, roll: check.roll, dept: check.department });
                MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
                    if (err) {
                      console.error(err);
                      return;
                    }
                  
                    const db = client.db(dbName);
                  
                    app.locals.db = db;
                  
                    
                  
                    app.get('/quiz', (req, res) => {
                      const sessionId = req.session.sessionId || crypto.randomBytes(16).toString('hex');
                      req.session.sessionId = sessionId;
                    
                      // Retrieve name, roll, and dept from the check object
                      const { name, roll, department } = check;
                    
                      res.render('quiz', { questions, sessionId, name, roll, department });
                    });
                    
                  
                  
                    app.post('/score', (req, res) => {
                      const sessionId = req.session.sessionId;
                      if (!sessionId) {
                        return res.redirect('/');
                      }
                      function getCurrentDateTime() {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = (now.getMonth() + 1).toString().padStart(2, '0');
                        const day = now.getDate().toString().padStart(2, '0');
                        const hours = now.getHours().toString().padStart(2, '0');
                        const minutes = now.getMinutes().toString().padStart(2, '0');
                        const seconds = now.getSeconds().toString().padStart(2, '0');
                        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
                      }
                      
                  
                      const userAnswers = req.body;
                      const score = calculateScore(userAnswers, questions);
                  
                      const db = req.app.locals.db;
                      const userData = {
                        
                        name: req.body.name,
                        rollno: req.body.roll,
                        department: check.department,
                        score: score,
                        submissionDateTime: getCurrentDateTime(), 
                      };
                      const usersCollection = db.collection('users');
                      usersCollection.insertOne(userData, (err) => {
                        if (err) {
                          console.error(err);
                        }
                      });
                  
                      req.session.destroy((err) => {
                        if (err) {
                          console.error(err);
                        }
                      });
                  
                      res.render('score', { score, questions });
                    });
                  
                    app.get('/leaderboard', (req, res) => {
                      const db = req.app.locals.db;
                      const usersCollection = db.collection('users');
                  
                      usersCollection.find().sort({ score: -1 }).toArray((err, leaderboard) => {
                        if (err) {
                          console.error(err);
                        }
                  
                        res.render('leaderboard', { leaderboard });
                      });
                    });

                    
                    app.get('/download', (req, res) => {
                      const db = req.app.locals.db;
                      const usersCollection = db.collection('users');
                  
                      usersCollection.find().sort({ score: -1 }).toArray((err, leaderboard) => {
                          if (err) {
                              console.error(err);
                              return res.send('An error occurred while retrieving the data.');
                          }
                  
                          const filePath = './leaderboard.csv';
                          const csvContent = "Name,Roll No,Department,Score\n" +
                              leaderboard.map(user => `${user.name},${user.rollno},${user.department},${user.score}`).join("\n");
                  
                          fs.writeFile(filePath, csvContent, (err) => {
                              if (err) {
                                  console.error(err);
                                  return res.send('An error occurred while creating the file.');
                              }
                  
                              res.download(filePath, 'leaderboard.csv', (err) => {
                                  if (err) {
                                      console.error(err);
                                      res.send('Error in downloading the file.');
                                  }
                                  fs.unlinkSync(filePath); 
                              });
                          });
                      });
                  });
                    
                    
                    
                  
                    
                  
                    function calculateScore(userAnswers, questions) {
                      let score = 0;
                      for (let i = 0; i < questions.length; i++) {
                        if (userAnswers[`q${i}`] === questions[i].correctAnswer) {
                          score++;
                        }
                      }
                      return score;
                    }
                  });
            } else {
                res.send("Wrong password");
            }
        }
    } catch (error) {
        console.error(error);
        res.send("An error occurred during login");
    }
});

const port = 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
