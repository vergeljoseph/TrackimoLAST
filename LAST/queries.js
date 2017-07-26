var promise = require('bluebird'),
    pg = require('pg'),
    session = require ('express-session'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    nodemailer = require('nodemailer'),
    schedule = require('node-schedule');

var mode;

var express = require('express');
express.Router().use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
var options = {
  // Initialization Options
  promiseLib: promise
};

var pgp = require('pg-promise')(options);
//var connectionString = "postgres://inventory:&3c6u4o@127.0.0.1:5432/csu_app_inventory";
var connectionString = "postgres://postgres:trackimo@localhost:5432/trackimo";
var db = pgp(connectionString);

 
function pageNotFound(req, res, next) {
  res.render('pagenotfound');
  res.end();
}

function check_user(req, res, next) {
  if(!(req.session.in)){
      console.log(">> Unauthorized User");
      return res.redirect('/');
      res.end();
  }
  else
    next();
}

function login(req, res, next){

  if(req.session.in == "log" || (!req.session.in))
    return res.render('login');
  else if(req.session.role == 'Admin')
    return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
  else
    return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
  res.end();
}

function userOut(req, res, next){
    console.log(">> Logged-out: " + req.session.user);
    req.session.in = "log"

    return res.redirect('/');
    res.end();
}

function userIn(req, res, next){
    
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Admin'", req.body),
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Staff'", req.body),
            t.any("SELECT * from users WHERE username = ${username} AND password = crypt (${password}, password) AND role = 'Checker'", req.body)
        ]);
    })
    .then(function (data) {
        if(data[0].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.password = req.body.password;
            req.session.details = data[0];
            var details = req.session.details;
            req.session.role = 'Admin';
            console.log(">> Logged-in: " + req.session.user);
            return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        }  else if(data[1].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.password = req.body.password;
            req.session.details = data[1];
            var details = req.session.details;
            req.session.role = 'Staff';
            console.log(">> Logged-in: " + req.session.user);
            return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        }  else if(data[2].length >= 1){
            req.session.in = true;
            req.session.user = req.body.username;
            req.session.password = req.body.password;
            req.session.details = data[2];
            var details = req.session.details;
            req.session.role = 'Checker';
            console.log(">> Logged-in: " + req.session.user);
            return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        } else{
            return res.render('login', {error: 'Incorrect credentials!'})
        }
        res.end();
    })
    .catch(function (err) {
      console.log("[USER-IN] " + err);
      return next(err);
    });
}

function dashing(req, res, next){
    console.log(">> On session: " + req.session.user);

    if(!(req.session.in))
        return res.redirect('/');
    else{
        return res.render('index', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    } 
    res.end();
}


function renderAddCategory(req, res, next) {
    if (req.session.role == 'Checker'){
      return res.redirect('restricted');
    }
      
    return res.render('addCategory', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
}

function renderAddCategoryBatch(req, res, next) {
    if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    return res.render('addCategoryBatch', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
}

function newCategory(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO category(category_name) VALUES ($1)",
        [req.body.category_name], 
        function (err, result) { 
            if (err) {
                res.redirect('/failed');
                return console.error('error running query', err);
            }
            done();
    });

    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added a category',
         req.session.user], 
        function (err, result) { 
          if (err) {
                res.redirect('/failed');
                return console.error('error running query', err);
            }
            done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function newCategoryBatch(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  var url = 'C:/LAST';
  var url_add = url + '/' + req.body.file_name;
  console.log(">> Copying file " + url_add);
  db.task(function (t) {
        return t.batch([
            t.any("SELECT loaddataCategory($1)", url_add)
            ]);
  })
  .then(function (data, err) {
        pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['batch added category',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
          return res.redirect('/success');
          res.end();
        });
  });
}

function renderEditCategory(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {

        return res.render('editCategory', {category: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function editProperCategory(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from category where category_id=${category}", req.body)
            ]);
    })
    .then(function (data) {
        return res.render('updateCategoryProper', {category: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
    })
    .catch(function(err) {
        res.redirect('/failed');
        return next(err);
    });
}

function updateCategoryFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE category SET category_name = $1 WHERE category_id = $2",
        [req.body.category_name,
         req.body.orig_category_id], 
        function (err, result) {
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['edited a category',
         req.session.user], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderRemoveCategory(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('removeCategory', {category: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function deleteCategoryFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM category WHERE category_id = $1",
        [req.body.category], 
        function (err, result){
             if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed a category',
         req.session.user], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function displayCategory(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category_view ORDER BY category_name"),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewCategory', {category: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function renderAddNiche(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('addNiche', {category: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function newNiche(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO niche(niche_name, category_id) VALUES ($1, $2)",
        [req.body.niche_name,
         req.body.category], 
        function (err, result) {
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added a niche',
         req.session.user], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function renderEditNiche(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('editNiche', {niche: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function editProperNiche(req, res, next) {
if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from  niche where niche_id=${niche}", req.body),
            t.any("SELECT * from category ORDER BY category_name")
            ]);
    })
    .then(function (data) {
        return res.render('updateNicheProper', {niche: data[0], category: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
    })
    .catch(function(err) {
      res.redirect('/failed');
        return next(err);
    });
}

function updateNicheFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE niche SET niche_name = $1 WHERE niche_id = $2",
        [req.body.niche_name,
         req.body.orig_niche_id
         ], 
        function (err, result) {
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    if (req.body.category != null ){
      client.query("UPDATE niche SET category_id = $1 WHERE niche_id = $2",
          [req.body.category,
           req.body.orig_niche_id
           ], 
          function (err, result) {
              if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
      });
    }
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['edited a niche',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function renderRemoveNiche(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * from niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('removeNiche', {niche: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function deleteNicheFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM niche WHERE niche_id = $1",
        [req.body.niche], 
        function (err, result) {
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed a niche',
         req.session.user], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function displayNiche(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM niche_view WHERE category_id = ${holder} ORDER BY niche_name ", req.body),
            t.any("SELECT category_name from category WHERE category_id = ${holder}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('viewNiche', {niche: data[0], category: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function renderAddLead(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name"),
            t.any("SELECT * from niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('addLead', {category: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function newLead(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {                
    client.query("INSERT INTO email_users(email_address, category_id, niche_id, company, contact_person, website, phone_number, address, timezone, date_added, staff_assigned, contact_url) VALUES ($1, $2, $3, $4, $5, SUBSTRING($6 FROM 'http://([^/]*).*'), $7, $8, $9, CURRENT_TIMESTAMP,$10, $11)",
        [req.body.email_address,
        req.body.category,
        req.body.niche,
        req.body.company,
        req.body.contact_person,
        req.body.website,
        req.body.phone_number,
        req.body.address,
        req.body.timezone,
        req.session.user,
        req.body.contact_url], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    client.query("INSERT INTO activity(email_address, category_id, niche_id) VALUES ($1, $2, $3)",
        [req.body.email_address,
        req.body.category,
        req.body.niche], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added a lead',
         req.session.user], 
        function (err, result) { 

            
    });
    return res.redirect('/success');
    res.end();
  });
}

function displayLead(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM email_users WHERE niche_id = ${holder} ORDER BY email_address ", req.body),
            t.any("SELECT niche_name from niche WHERE niche_id = ${holder}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('viewLead', {lead: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displayLeadDetails(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT email_id, email_address, category_id, niche_id, company, contact_person, website, phone_number, address, timezone, staff_assigned, contact_url, to_char(date_added, 'Mon') as month, EXTRACT(DAY from date_added) as day, EXTRACT(YEAR from date_added) as year FROM email_users WHERE email_id = ${holder}", req.body),
            t.any("SELECT category_name from category, email_users WHERE category.category_id = email_users.category_id AND email_id = ${holder}", req.body),
            t.any("SELECT niche_name from niche, email_users WHERE niche.niche_id = email_users.niche_id AND email_id = ${holder}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('viewLeadDetails', {lead: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function renderEditLead(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM email_users WHERE email_id = ${email}", req.body),
            t.any("SELECT * from category ORDER BY category_name"),
            t.any("SELECT * from niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('editLead', {lead: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function updateLeadFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE email_users SET company = $1 WHERE email_id = $2",
          [req.body.company,
           req.body.email
           ], 
          function (err, result) {
              if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET email_address = $1 WHERE email_id = $2",
          [req.body.email_address,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET contact_person = $1 WHERE email_id = $2",
          [req.body.contact_person,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET phone_number = $1 WHERE email_id = $2",
          [req.body.phone_number,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET website = $1 WHERE email_id = $2",
          [req.body.website,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET contact_url = $1 WHERE email_id = $2",
          [req.body.contact_url,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET address = $1 WHERE email_id = $2",
          [req.body.address,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE email_users SET timezone = $1 WHERE email_id = $2",
          [req.body.timezone,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    if (req.body.category != null ){
      client.query("UPDATE email_users SET category_id = $1 WHERE email_id = $2",
          [req.body.category,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
      });
    }
    if (req.body.niche != null ){
      client.query("UPDATE email_users SET niche_id = $1 WHERE email_id = $2",
          [req.body.niche,
           req.body.email
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
      });
    }
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['edited a lead',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function deleteLeadFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM email_users WHERE email_id = $1",
        [req.body.email], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed a lead',
         req.session.user], 
        function (err, result) {  
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderSearchLead(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT COUNT(email_id) FROM email_users as count"),
            t.any("SELECT COUNT(category_id) FROM category as count"),
            t.any("SELECT COUNT(niche_id) FROM niche as count")
            ]);
  })
  .then(function (data, err) {
        return res.render('searchLead', {lead: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displaySearchLead(req, res, next) {
  if (req.body.email_address != null){
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM email_users WHERE email_address ILIKE $1", ['%' + req.body.email_address + '%']),
              t.any("SELECT category_name from category, email_users WHERE category.category_id = email_users.category_id AND email_address = ${email_address}", req.body),
              t.any("SELECT niche_name from niche, email_users WHERE niche.niche_id = email_users.niche_id AND email_address = ${email_address}", req.body)
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewLeadDetails', {error: 'No results found', lead: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewLeadDetails', {lead: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
          
        res.end();
    });
  }else{
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM email_users WHERE company ILIKE $1 ORDER BY company", ['%' + req.body.company + '%'])
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewLead', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewLead', {lead: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
          

    });
  }
}

function renderAddAdvertiser(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    return res.render('addAdvertiser', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
}

function newAdvertiser(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO advertisers(company_name, website, social_media, email_address, remarks, phone_number, contact_person) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [req.body.company_name,
        req.body.website,
        req.body.social_media,
        req.body.email_address,
        req.body.remarks,
        req.body.phone_number,
        req.body.contact_person], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added an advertiser',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function displayAdvertiser(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM advertisers ORDER BY company_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('viewAdvertiser', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displayAdvertiserDetails(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM advertisers WHERE id = ${holder}", req.body),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewAdvertiserDetails', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function deleteAdvertiserFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM advertisers WHERE id = $1",
        [req.body.id], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });

    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed an advertiser',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderEditAdvertiser(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM advertisers WHERE id = ${id}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('editAdvertiser', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function updateAdvertiserFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE advertisers SET company_name = $1 WHERE id = $2",
          [req.body.company_name,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET email_address = $1 WHERE id = $2",
          [req.body.email_address,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET contact_person = $1 WHERE id = $2",
          [req.body.contact_person,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET phone_number = $1 WHERE id = $2",
          [req.body.phone_number,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET website = $1 WHERE id = $2",
          [req.body.website,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET social_media = $1 WHERE id = $2",
          [req.body.social_media,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE advertisers SET remarks = $1 WHERE id = $2",
          [req.body.remarks,
           req.body.id
           ], 
          function (err, result) {
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['edited an advertiser',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function renderSearchAdvertiser(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
   db.task(function (t) {
        return t.batch([
            t.any("SELECT COUNT(id) FROM advertisers as count")
            ]);
  })
  .then(function (data, err) {
        return res.render('searchAdvertiser', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displaySearchAdvertiser(req, res, next) {
  if (req.body.email_address != null){
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM advertisers WHERE email_address = ${email_address}", req.body),
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewAdvertiserDetails', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewAdvertiserDetails', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
          

    });
  }else{
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM advertisers WHERE company_name ILIKE $1 ORDER BY company_name", ['%' + req.body.company_name + '%'])
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewAdvertiser', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewAdvertiser', {advertiser: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
          
        res.end();
    });
  }
}

function renderAddStaff(req, res, next) {
  if (req.session.role == 'Checker' || req.session.role == 'Staff'){
      return res.redirect('/restricted');
    }
    return res.render('addStaff', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
}

function newStaff(req, res, next) {
  if (req.session.role == 'Checker' || req.session.role == 'Staff'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO users(first_name,middle_init,last_name,username,password,role,prof_pic) VALUES ($1, $2, $3, $4, crypt($5, gen_salt('md5')), $6, $7)",
        [req.body.first_name,
        req.body.middle_init,
        req.body.last_name,
        req.body.username,
        req.body.password,
        req.body.role,
        req.body.avatar], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added a new staff',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    res.redirect('/success');
    res.end();
  });
}

function editStaffFinal(req, res, next) {
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE users SET password = crypt($1, gen_salt('md5')) WHERE username = $2",
        [req.body.new_password,
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderRemoveStaff(req, res, next) {
  if (req.session.role == 'Checker' || req.session.role == 'Staff'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM users ORDER BY first_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('removeStaff', {staff: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function renderEditStaff(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM users ORDER BY first_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('editStaff', {staff: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function viewStaffDetails(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * from users WHERE user_id = ${staff}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('viewStaffDetails', {staff: data[0], category: data[1], niche: data[2], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function deleteStaffFinal(req, res, next) {
  if (req.session.role == 'Checker' || req.session.role == 'Staff'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM users WHERE user_id = $1",
        [req.body.staff], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed a staff',
         req.session.user], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function renderAddLeadBatch(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name"),
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('addLeadBatch', {category: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function newLeadBatch(req, res, next) {
    if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    var url = 'C:/LAST';
    var url_add = url + '/' + req.body.file_name;
    console.log("Copying file " + url_add);
    var category = req.body.category;
    var niche = req.body.niche;
    var error = 0;

    pg.connect(connectionString,function (err, client, done) {
              client.query("SELECT loaddataLeads($1)",
                [url_add], function (err, result) {
                      if (err) {
                          console.error('error running query', err);
                          return res.redirect('/failed');
                          done();
                      }else{
                        client.query("UPDATE dummy_email SET category_id = $1",
                            [category], function (err, result) {
                                if (err) {
                                    console.error('error running query', err);
                                    return res.redirect('/failed'); 
                                    done();
                                }else{
                                  client.query("UPDATE dummy_email SET niche_id = $1",
                                      [niche], function (err, result) {
                                          if (err) {
                                            console.error('error running query', err);
                                            return res.redirect('/failed');
                                            done();
                                          }else{
                                            client.query("UPDATE dummy_email SET date_added = $1",
                                              [req.body.date_added], function (err, result) {
                                                  if (err) {
                                                      console.error('error running query', err);
                                                      return res.redirect('/failed');
                                                      done();
                                                  }else{
                                                    client.query("UPDATE dummy_email SET staff_assigned = $1",
                                                      [req.session.user], function (err, result) {
                                                        if (err) {
                                                            console.error('error running query', err);
                                                            return res.redirect('/failed'); 
                                                            done();
                                                        }else{
                                                          client.query("INSERT INTO email_users SELECT * FROM dummy_email", function (err, result) {
                                                            if (err) {
                                                                console.error('error running query', err);
                                                                return res.redirect('/failed'); 
                                                                done();
                                                            }else{
                                                              client.query("INSERT INTO activity (email_address, category_id, niche_id) SELECT email_address, category_id, niche_id FROM dummy_email", function (err, result) {
                                                                  if (err) {
                                                                    console.error('error running query', err);
                                                                    return res.redirect('/failed'); 
                                                                    done();
                                                                  }else{
                                                                    client.query("DELETE FROM dummy_email", function (err, result) {
                                                                        if (err) {
                                                                            console.error('error running query', err);
                                                                            return res.redirect('/failed');
                                                                            done();
                                                                        }else{
                                                                          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
                                                                            ['batch added a lead',
                                                                              req.session.user], function (err, result) {
                                                                                if (err) {
                                                                                    console.error('error running query', err);
                                                                                    return res.redirect('/failed');
                                                                                    done();
                                                                                }else{
                                                                                   res.redirect('/success');
                                                                                   done();
                                                                                }
                                                                          });
                                                                        }
                                                                    });
                                                                  }
                                                                });
                                                            }
                                                          });
                                                        }
                                                    });
                                                  }
                                            });
                                          }
                                  });
                                }
                        });
                      }
               });
    });
}

function renderAddAffiliate(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  return res.render('addAffiliate', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
  res.end();
}

function newAffiliate(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO affiliates(company_name, website, social_media, email_address, remarks, phone_number, contact_person) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [req.body.company_name,
        req.body.website,
        req.body.social_media,
        req.body.email_address,
        req.body.remarks,
        req.body.phone_number,
        req.body.contact_person], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['added an affiliate',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
    return res.redirect('/success');
    res.end();
  });
}

function displayAffiliate(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM affiliates ORDER BY company_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('viewAffiliate', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displayAffiliateDetails(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM affiliates WHERE id = ${holder}", req.body),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewAffiliateDetails', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function deleteAffiliateFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM affiliates WHERE id = $1",
        [req.body.id], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['removed an affiliate',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderEditAffiliate(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM affiliates WHERE id = ${id}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('editAffiliate', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function updateAffiliateFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE affiliates SET company_name = $1 WHERE id = $2",
          [req.body.company_name,
           req.body.id
           ], 
          function (err, result) { if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET email_address = $1 WHERE id = $2",
          [req.body.email_address,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET contact_person = $1 WHERE id = $2",
          [req.body.contact_person,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET phone_number = $1 WHERE id = $2",
          [req.body.phone_number,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET website = $1 WHERE id = $2",
          [req.body.website,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET social_media = $1 WHERE id = $2",
          [req.body.social_media,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE affiliates SET remarks = $1 WHERE id = $2",
          [req.body.remarks,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['edited an affiliate',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
    return res.redirect('/success');
    res.end();
  });
}

function renderSearchAffiliate(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT COUNT(id) FROM affiliates as count")
            ]);
  })
  .then(function (data, err) {
        return res.render('searchAffiliate', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displaySearchAffiliate(req, res, next) {
  if (req.body.email_address != null){
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM affiliates WHERE email_address = ${email_address}", req.body),
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewAffiliateDetails', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewAffiliateDetails', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
          res.end();

    });
  }else{
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM affiliates WHERE company_name ILIKE $1 ORDER BY company_name", ['%' + req.body.company_name + '%'])
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewAffiliate', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewAffiliate', {affiliate: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
          res.end();

    });
  }
}

function displayReport(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name"),
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('viewReport', {category: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
  });
}

function setSchedule(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name"),
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('setSchedule', {category: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function newSchedule(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE activity SET email_status = $1, campaign_date = $4 WHERE category_id = $2 AND niche_id = $3",
        ['DNO',
         req.body.category,
         req.body.niche,
         req.body.date], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
        
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['set a campaign schedule',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
  
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM schedule WHERE niche = (SELECT niche_name from niche WHERE niche_id = $1)", req.body.niche)
            ]);
  })
  .then(function (data, err) {
        if(data[0].length >= 1){
          console.log("NAA");
          client.query("UPDATE schedule SET start = $1 WHERE niche = (SELECT niche_name from niche WHERE niche_id = $2)",
              [req.body.date,
               req.body.niche], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
          });
        }else{
          client.query("INSERT INTO schedule(start, category, niche, type) VALUES ($1, (SELECT category_name FROM category WHERE category_id = $2), (SELECT niche_name FROM niche WHERE niche_id = $3), $4)",
              [req.body.date,
               req.body.category,
               req.body.niche,
               req.body.sched_type], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
          });
        }

  });
    message = "Good day!\n\nReminding you of the campaign schedule set on " + req.body.date +".\nTo view full details, visit http://192.168.32.89:3000/calendar.\n\nThank you.";
    send_email(message);
    return res.redirect('/success');
    res.end();
  });
}

function displayReport2(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM report, activity WHERE report.email_address = activity.email_address AND category_name = $1 AND niche_name = $2 AND campaign_date = $3 AND report.email_status =$4 ORDER BY category_name",
              [req.body.category,
               req.body.niche,
               req.body.date,
               req.body.status]),
            ]);
  })
  .then(function (data, err) {
        return res.render('displayReport', {report: data[0], campaign: req.body.date, user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function updateReportFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE activity SET email_status = $1 WHERE email_address = $2",
        [req.body.status,
         req.body.holder], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['batch updated lead email status',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderUpdateReport(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM category ORDER BY category_name"),
            t.any("SELECT * FROM niche ORDER BY niche_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('updateReport', {category: data[0], niche: data[1], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function newUpdateReport(req, res, next) {
  var url = 'C:/LAST';
  var url_add = url + '/' + req.body.file_name;
  console.log("Copying file " + url_add);

  var category = req.body.category;
  var niche = req.body.niche;
  db.task(function (t) {
        return t.batch([
            t.any("SELECT loaddataReport($1)",
              [url_add]),
            t.any("UPDATE dummy_activity_second SET category_id = $1",
              [category]),
            t.any("UPDATE dummy_activity_second SET niche_id = $1",
              [niche]),
            t.any("UPDATE dummy_activity_second SET campaign_date = $1",
              [req.body.date]),
            t.any("UPDATE dummy_activity_second SET email_status = $1",
              [req.body.status]),
            t.any("INSERT INTO dummy_activity SELECT * FROM activity"),
            t.any("DELETE FROM activity"),
            t.any("INSERT INTO activity SELECT * FROM dummy_activity_second"),
            t.any("INSERT INTO activity SELECT * FROM dummy_activity"),
            t.any("DELETE FROM dummy_activity"),
            t.any("DELETE FROM dummy_activity_second"),
            // t.any("ALTER SEQUENCE dummy_email_email_id_seq RESTART WITH 1")
            ]);
  })
  .then(function (data, err) {
    pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['updated a lead email status',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
        return res.redirect('/dashboard');
        res.end();

  });
}

function chartInteractive(req, res, next) {
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var query = client.query("SELECT * FROM viewdailyreport LIMIT 1");
  
    query.on('row', (row) => {
      results.push(row);
    });

    query.on('end', () => {
     done();
    return res.json(results);
    });
  });
}


function getLastYear(req, res, next) {
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var query = client.query("SELECT * FROM viewmonthlyreport LIMIT 12");
  
    query.on('row', (row) => {
      results.push(row);
    });

    query.on('end', () => {
     done();
    return res.json(results);
    });
  });
}

function getLastMonth(req, res, next) {
  const results = [];
  pg.connect(connectionString, (err, client, done) => {
    if(err) {
      done();
      console.log(err);
      return res.status(500).json({success: false, data: err});
    }
    var query = client.query('SELECT * FROM viewdailyreport LIMIT 30');
  
    query.on('row', (row) => {
      results.unshift(row);
    });

    query.on('end', () => {
    done();
    return res.json(results);
    });
  });
}

function renderCalendar(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    db.task(function (t) {
        return t.batch([
            t.any("SELECT type, start, id, category, niche, to_char(start, 'Mon') as month, EXTRACT(DAY from start) as day, EXTRACT(YEAR from start) as year FROM schedule WHERE start >= CURRENT_DATE ORDER BY year, month, day"),
        ]);
    })
    .then(function (data) {
      
      res.status(200)
      return res.render('calendar', {sched: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
      res.end();
    })
    .catch(function (err) {
      return next(err);
  });
}

function deleteScheduleFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    console.log(req.body.holder2)
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM schedule WHERE id = $1",
        [req.body.holder], 
        function (err, result) { 

            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE activity SET email_status = $1 WHERE niche_id = (SELECT niche_id from niche WHERE niche_name = $2)",
        [null,
         req.body.holder2], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
        
    });
    client.query("UPDATE activity SET campaign_date = $1 WHERE niche_id = (SELECT niche_id from niche WHERE niche_name = $2)",
        [null,
         req.body.holder2], 
        function (err, result) {
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
        
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['removed a schedule',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
    return res.redirect('/success');
    res.end();
  });
}

function renderSuccess(req, res, next){
    console.log("> SUCCESS!");
    return res.render('success', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
    
}

function renderFailed(req, res, next){
  console.log("> FAILED!");
    return res.render('failed', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();

}

function renderRestricted(req, res, next){
    return res.render('restricted', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
}

function generateList(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT email_address, company, contact_person, website, phone_number, address, timezone, date_added, staff_assigned, contact_url from email_users WHERE niche_id = (SELECT niche_id from niche WHERE niche_name = $1)", req.params.niche_name)
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated a lead list',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      res.send(JSON.stringify(data, null, " "));
    })
    .catch(function (err) {
      return next(err);
    });
}

function generateReport(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT activity.email_address, company, contact_person, website, phone_number, address, timezone, date_added, staff_assigned, contact_url from activity,email_users WHERE activity.niche_id = (SELECT niche_id from niche WHERE niche_name = $1) AND activity.email_status = $2 AND activity.campaign_date = $3 AND activity.email_address = email_users.email_address", [req.params.niche_name, req.params.email_status, req.params.campaign])
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated lead report',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      res.send(JSON.stringify(data, null, " "));
    })
    .catch(function (err) {
      return next(err);
    });
}

function generateAffiliates(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT company_name, website, social_media, email_address, remarks, phone_number, contact_person from affiliates")
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated list of affiliates',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      res.send(JSON.stringify(data, null, " "));
    })
    .catch(function (err) {
       // console.log("[INVENT-REPORT] " + err); 
      return next(err);
    });
}

function generateAdvertisers(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT company_name, website, social_media, email_address, remarks, phone_number, contact_person from advertisers")
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated list of advertisers',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      res.send(JSON.stringify(data, null, " "));

    })
    .catch(function (err) {
      return next(err);
    });
}

function send_email(message) {
    var email;
    email = ['venice.utech@gmail.com', 'christy.utech@gmail.com'];
    var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'leads.trackimo@gmail.com',
            pass: 'info.leads'
        }
    };

    var transporter = nodemailer.createTransport(smtpConfig);

    for (var i = 0; i < email.length; i++){
      var mailOptions = {
          from: '"Lead Automation System for Trackimo" <leads.trackimo@gmail.com>', // sender address
          to: email[i], // list of receivers bar@blurdybloop.com, baz@blurdybloop.com
          subject: 'Reminder', // Subject line
          text: message // plaintext body
          //html: '<b>Hello world 🐴</b>' // html body
      };

      transporter.sendMail(mailOptions, function(error, info){
          console.log('Message sent: ' + info.response);
      });
  }
}

function viewRecords(req, res, next) {
    if (req.session.role == 'Checker' || req.session.role == 'Staff'){
      return res.redirect('restricted');
    }
    db.task(function (t) {
        return t.batch([
            t.any("SELECT * from users"),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewRecords', {records: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });  
}

function displayRecords(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT date_added, username, count, to_char(date_added, 'Mon') as month, EXTRACT(DAY from date_added) as day, EXTRACT(YEAR from date_added) as year FROM records WHERE username = $1", req.body.username),
            ]);
  })
  .then(function (data, err) {
        return res.render('displayRecords', {records: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}


function generateRecords(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT email_address from email_users WHERE staff_assigned = $1 AND date_added = $2", [req.params.username, req.params.date_added])
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated staff daily records',
               req.session.user], 
              function (err, result) {
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      return res.send(JSON.stringify(data, null, " "));
      res.end();
    })
    .catch(function (err) {
      return next(err);
    });
}

function displayTransactionLog(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT date_added, title, actor, to_char(date_added, 'Mon') as month, EXTRACT(DAY from date_added) as day, EXTRACT(YEAR from date_added) as year, to_char(time_added::Time, 'HH12:MI:SS AM') as timeofaction, time_added FROM transaction_log ORDER BY date_added DESC LIMIT 100"),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewTransactionLog', {transaction: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function renderAddInfluencer(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    return res.render('addInfluencer', {user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
    res.end();
}

function newInfluencer(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("INSERT INTO influencers(company_name, website, email_address, phone_number, contact_person, facebook, twitter, instagram, youtube, pinterest, linkedin, google_plus) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [req.body.company_name,
        req.body.website,
        req.body.email_address,
        req.body.phone_number,
        req.body.contact_person,
        req.body.facebook,
        req.body.twitter,
        req.body.instagram,
        req.body.youtube,
        req.body.pinterest,
        req.body.linkedin,
        req.body.google_plus], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['added an influencer',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function displayInfluencer(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM influencers ORDER BY company_name")
            ]);
  })
  .then(function (data, err) {
        return res.render('viewInfluencer', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displayInfluencerDetails(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM influencers WHERE id = ${holder}", req.body),
            ]);
  })
  .then(function (data, err) {
        return res.render('viewInfluencerDetails', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function deleteInfluencerFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  pg.connect(connectionString, function (err, client, done) {
    if (err){
      res.redirect('/failed');
        return console.error('error fetching client from pool', err);
    }                   
    client.query("DELETE FROM influencers WHERE id = $1",
        [req.body.id], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });

    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['removed an influencer',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
    // var query = "UPDATE category SET category_name = (${category_name}) where category_id = ${orig_category_id}";
}

function renderEditInfluencer(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  db.task(function (t) {
        return t.batch([
            t.any("SELECT * FROM influencers WHERE id = ${id}", req.body)
            ]);
  })
  .then(function (data, err) {
        return res.render('editInfluencer', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function updateInfluencerFinal(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
    pg.connect(connectionString, function (err, client, done) {
    if (err){
        return console.error('error fetching client from pool', err);
    }                   
    client.query("UPDATE influencers SET company_name = $1 WHERE id = $2",
          [req.body.company_name,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET email_address = $1 WHERE id = $2",
          [req.body.email_address,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET contact_person = $1 WHERE id = $2",
          [req.body.contact_person,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET phone_number = $1 WHERE id = $2",
          [req.body.phone_number,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET website = $1 WHERE id = $2",
          [req.body.website,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET facebook = $1 WHERE id = $2",
          [req.body.facebook,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET twitter = $1 WHERE id = $2",
          [req.body.twitter,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET instagram = $1 WHERE id = $2",
          [req.body.instagram,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET youtube = $1 WHERE id = $2",
          [req.body.youtube,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET pinterest = $1 WHERE id = $2",
          [req.body.pinterest,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET linkedin = $1 WHERE id = $2",
          [req.body.linkedin,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("UPDATE influencers SET google_plus = $1 WHERE id = $2",
          [req.body.google_plus,
           req.body.id
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO remarks(influencer_id, comment, date_added) VALUES ($1, $2, $3)",
          [req.body.id,
           req.body.remarks,
           req.body.date_added
           ], 
          function (err, result) { 
            if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
    });
    client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
        ['edited an influencer',
         req.session.user], 
        function (err, result) { 
          if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
            
    });
    return res.redirect('/success');
    res.end();
  });
}

function renderSearchInfluencer(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
   db.task(function (t) {
        return t.batch([
            t.any("SELECT COUNT(id) FROM influencers as count")
            ]);
  })
  .then(function (data, err) {
        return res.render('searchInfluencer', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function displaySearchInfluencer(req, res, next) {
  if (req.body.email_address != null){
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM influencers WHERE email_address = ${email_address}", req.body),
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewInfluencerDetails', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewInfluencerDetails', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();
          

    });
  }else{
    db.task(function (t) {
          return t.batch([
              t.any("SELECT * FROM influencers WHERE company_name ILIKE $1 ORDER BY company_name", ['%' + req.body.company_name + '%'])
              ]);
    })
    .then(function (data, err) {
        if (data[0].length < 1)
          return res.render('viewInfluencer', {error: 'No results found', user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        else
          return res.render('viewInfluencer', {influencer: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
          
        res.end();
    });
  }
}

function displayInfluencerRemarks(req, res, next) {
  db.task(function (t) {
        return t.batch([
            t.any("SELECT comment, date_added, to_char(date_added, 'Mon') as month, EXTRACT(DAY from date_added) as day, EXTRACT(YEAR from date_added) as year FROM remarks WHERE influencer_id = $1 ORDER BY date_added DESC", req.body.inf_id)
            ]);
  })
  .then(function (data, err) {
        return res.render('viewInfluencerRemarks', {remarks: data[0], user: req.session.user, avatar: req.session.details, pass: req.session.password, role: req.session.role});
        res.end();

  });
}

function generateInfluencers(req, res, next) {
  if (req.session.role == 'Checker'){
      return res.redirect('/restricted');
    }
  res.setHeader('Content-Type', 'application/json');
  db.any("SELECT company_name, website, facebook, twitter, instagram, youtube, pinterest, linkedin, google_plus, email_address, phone_number, contact_person from influencers")
    .then(function (data) {
      pg.connect(connectionString, function (err, client, done) {                
          client.query("INSERT INTO transaction_log(title, actor, date_added, time_added) VALUES ($1, $2, CURRENT_TIMESTAMP, localtime)",
              ['generated list of influencers',
               req.session.user], 
              function (err, result) { 
                if (err) {
                  res.redirect('/failed');
                  return console.error('error running query', err);
              }
              done();
                  
          });
        });
      res.send(JSON.stringify(data, null, " "));

    })
    .catch(function (err) {
      return next(err);
    });
}

module.exports = {
    check_user:check_user,
    login:login,
    userIn:userIn,
    userOut:userOut,
    dashing:dashing,
    renderAddCategory:renderAddCategory,
    newCategory:newCategory,
    renderEditCategory:renderEditCategory,
    editProperCategory:editProperCategory,
    updateCategoryFinal:updateCategoryFinal,
    renderRemoveCategory:renderRemoveCategory,
    deleteCategoryFinal:deleteCategoryFinal,
    displayCategory:displayCategory,
    renderAddNiche:renderAddNiche,
    newNiche:newNiche,
    renderEditNiche:renderEditNiche,
    editProperNiche:editProperNiche,
    renderAddCategoryBatch:renderAddCategoryBatch,
    newCategoryBatch:newCategoryBatch,
    updateNicheFinal:updateNicheFinal,
    renderRemoveNiche:renderRemoveNiche,
    deleteNicheFinal:deleteNicheFinal,
    displayNiche:displayNiche,
    renderAddLead:renderAddLead,
    newLead:newLead,
    displayLead:displayLead,
    displayLeadDetails:displayLeadDetails,
    renderEditLead:renderEditLead,
    updateLeadFinal:updateLeadFinal,
    deleteLeadFinal:deleteLeadFinal,
    renderSearchLead:renderSearchLead,
    displaySearchLead:displaySearchLead,
    renderAddAdvertiser:renderAddAdvertiser,
    newAdvertiser:newAdvertiser,
    displayAdvertiser:displayAdvertiser,
    displayAdvertiserDetails:displayAdvertiserDetails,
    deleteAdvertiserFinal:deleteAdvertiserFinal,
    renderEditAdvertiser:renderEditAdvertiser,
    updateAdvertiserFinal:updateAdvertiserFinal,
    renderSearchAdvertiser:renderSearchAdvertiser,
    displaySearchAdvertiser:displaySearchAdvertiser,
    renderAddStaff:renderAddStaff,
    newStaff:newStaff,
    renderRemoveStaff:renderRemoveStaff,
    deleteStaffFinal:deleteStaffFinal,
    renderEditStaff:renderEditStaff,
    renderAddLeadBatch:renderAddLeadBatch,
    newLeadBatch:newLeadBatch,
    renderAddAffiliate:renderAddAffiliate,
    newAffiliate:newAffiliate,
    displayAffiliate:displayAffiliate,
    displayAffiliateDetails:displayAffiliateDetails,
    deleteAffiliateFinal:deleteAffiliateFinal,
    renderEditAffiliate:renderEditAffiliate,
    updateAffiliateFinal:updateAffiliateFinal,
    renderSearchAffiliate:renderSearchAffiliate,
    displaySearchAffiliate:displaySearchAffiliate,
    displayReport:displayReport,
    setSchedule:setSchedule,
    newSchedule:newSchedule,
    displayReport2:displayReport2,
    updateReportFinal:updateReportFinal,
    renderUpdateReport:renderUpdateReport,
    newUpdateReport:newUpdateReport,
    getLastYear:getLastYear,
    getLastMonth:getLastMonth,
    chartInteractive:chartInteractive,
    renderCalendar:renderCalendar,
    deleteScheduleFinal:deleteScheduleFinal,
    renderSuccess:renderSuccess,
    renderFailed:renderFailed,
    renderRestricted:renderRestricted,
    generateList:generateList,
    generateReport:generateReport,
    generateAffiliates:generateAffiliates,
    generateAdvertisers:generateAdvertisers,
    send_email:send_email,
    viewRecords:viewRecords,
    displayRecords:displayRecords,
    generateRecords:generateRecords,
    viewStaffDetails:viewStaffDetails,
    pageNotFound:pageNotFound,
    displayTransactionLog:displayTransactionLog,
    editStaffFinal:editStaffFinal,
    renderAddInfluencer:renderAddInfluencer,
    newInfluencer:newInfluencer,
    displayInfluencer:displayInfluencer,
    displayInfluencerDetails:displayInfluencerDetails,
    deleteInfluencerFinal:deleteInfluencerFinal,
    renderEditInfluencer:renderEditInfluencer,
    updateInfluencerFinal:updateInfluencerFinal,
    renderSearchInfluencer:renderSearchInfluencer,
    displaySearchInfluencer:displaySearchInfluencer,
    displayInfluencerRemarks:displayInfluencerRemarks,
    generateInfluencers:generateInfluencers
};