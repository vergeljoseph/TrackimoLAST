var express = require('express'),
    app = express(),
    session = require ('express-session');
var path = require('path');
var formidable = require('formidable');
var FormData = require('form-data');
var fs = require('fs');


var router = express.Router();

var db = require('./queries');

router.use(session({secret: "ilovephilippines", resave: false, saveUninitialized:true}));
// var web = require('./webpages');

//web routes

router.get('/', db.login);                                  ////
router.get('/logout', db.check_user, db.userOut);
router.post('/login', db.userIn);
router.get('/dashboard', db.check_user, db.dashing);

/* DONE */router.get('/addCategory', db.check_user, db.renderAddCategory);
/* DONE */router.get('/addCategoryBatch', db.check_user, db.renderAddCategoryBatch);
/* DONE */router.get('/removeCategory', db.check_user, db.renderRemoveCategory);
/* DONE */router.post('/confirmAdd', db.check_user, db.newCategory);
/* DONE */router.post('/confirmAddBatch', db.check_user, db.newCategoryBatch);
/* DONE */router.get('/editCategory', db.check_user, db.renderEditCategory);
/* DONE */router.post('/searchCategoryForEdit', db.check_user, db.editProperCategory);
/* DONE */router.post('/updateCategoryFinal', db.check_user, db.updateCategoryFinal);
/* DONE */router.post('/deleteCategory', db.check_user, db.deleteCategoryFinal);
/* DONE */router.get('/viewCategory', db.check_user, db.displayCategory);

/* NICHE */
/* DONE */router.get('/addNiche', db.check_user, db.renderAddNiche);
/* DONE */router.post('/confirmAddNiche', db.check_user, db.newNiche);
/* DONE */router.get('/editNiche', db.check_user, db.renderEditNiche);
/* DONE */router.post('/searchNicheForEdit', db.check_user, db.editProperNiche);
/* DONE */router.post('/updateNicheFinal', db.check_user, db.updateNicheFinal);
/* DONE */router.get('/removeNiche', db.check_user, db.renderRemoveNiche);
/* DONE */router.post('/deleteNiche', db.check_user, db.deleteNicheFinal);
/* DONE */router.post('/nicheCategorized', db.check_user, db.displayNiche);

/* LEADS */
/* DONE */router.get('/addLead', db.check_user, db.renderAddLead);
/* DONE */router.post('/confirmAddLead', db.check_user, db.newLead);
/* DONE */router.get('/addLeadBatch', db.check_user, db.renderAddLeadBatch);
/* DONE */router.post('/confirmAddLeadBatch', db.check_user, db.newLeadBatch);
/* DONE */router.post('/leadsCategorized', db.check_user, db.displayLead);
/* DONE */router.post('/viewLead', db.check_user, db.displayLeadDetails);
/* DONE */router.post('/editLead', db.check_user, db.renderEditLead);
/* DONE */router.post('/updateLeadFinal', db.check_user, db.updateLeadFinal);
/* DONE */router.post('/removeLead', db.check_user, db.deleteLeadFinal);
/* DONE */router.get('/searchLead', db.check_user, db.renderSearchLead);
/* DONE */router.post('/displaySearchLead', db.check_user, db.displaySearchLead);

/* LEADS */
/* DONE */router.get('/addAdvertiser', db.check_user, db.renderAddAdvertiser);
/* DONE */router.post('/confirmAddAdvertiser', db.check_user, db.newAdvertiser);
/* DONE */router.get('/viewAdvertiser', db.check_user, db.displayAdvertiser);
/* DONE */router.post('/viewAdvertiserDetails', db.check_user, db.displayAdvertiserDetails);
/* DONE */router.post('/removeAdvertiser', db.check_user, db.deleteAdvertiserFinal)
/* DONE */router.post('/editAdvertiser', db.check_user, db.renderEditAdvertiser);
/* DONE */router.post('/updateAdvertiserFinal', db.check_user, db.updateAdvertiserFinal);
/* DONE */router.get('/searchAdvertiser', db.check_user, db.renderSearchAdvertiser);
/* DONE */router.post('/displaySearchAdvertiser', db.check_user, db.displaySearchAdvertiser);

/* DONE */router.get('/addStaff', db.check_user, db.renderAddStaff);
/* DONE */router.post('/confirmAddStaff', db.check_user, db.newStaff);
/* DONE */router.get('/removeStaff', db.check_user, db.renderRemoveStaff);
/* DONE */router.get('/editStaff', db.check_user, db.renderEditStaff);
/* DONE */router.post('/editStaffFinal', db.check_user, db.editStaffFinal);
/* DONE */router.post('/deleteStaff', db.check_user, db.deleteStaffFinal);
// /* DONE */router.post('/viewStaffDetails', db.check_user, db.viewStaffDetails);

/* AFFILIATES */
/* DONE */router.get('/addAffiliate', db.check_user, db.renderAddAffiliate);
/* DONE */router.post('/confirmAddAffiliate', db.check_user, db.newAffiliate);
/* DONE */router.get('/viewAffiliate', db.check_user, db.displayAffiliate);
/* DONE */router.post('/viewAffiliateDetails', db.check_user, db.displayAffiliateDetails);
/* DONE */router.post('/removeAffiliate', db.check_user, db.deleteAffiliateFinal)
/* DONE */router.post('/editAffiliate', db.check_user, db.renderEditAffiliate);
/* DONE */router.post('/updateAffiliateFinal', db.check_user, db.updateAffiliateFinal);
/* DONE */router.get('/searchAffiliate', db.check_user, db.renderSearchAffiliate);
/* DONE */router.post('/displaySearchAffiliate', db.check_user, db.displaySearchAffiliate);


/* Influencers */
/* DONE */router.get('/addInfluencer', db.check_user, db.renderAddInfluencer);
/* DONE */router.post('/confirmAddInfluencer', db.check_user, db.newInfluencer);
/* DONE */router.get('/viewInfluencer', db.check_user, db.displayInfluencer);
/* DONE */router.post('/viewInfluencerDetails', db.check_user, db.displayInfluencerDetails);
/* DONE */router.post('/removeInfluencer', db.check_user, db.deleteInfluencerFinal)
/* DONE */router.post('/editInfluencer', db.check_user, db.renderEditInfluencer);
/* DONE */router.post('/updateInfluencerFinal', db.check_user, db.updateInfluencerFinal);
/* DONE */router.get('/searchInfluencer', db.check_user, db.renderSearchInfluencer);
/* DONE */router.post('/displaySearchInfluencer', db.check_user, db.displaySearchInfluencer);
/* DONE */router.post('/viewInfluencerRemarks', db.check_user, db.displayInfluencerRemarks);

/* REPORTS */
/* DONE */router.get('/viewReport', db.check_user, db.displayReport);
/* DONE */router.post('/displayReport', db.check_user, db.displayReport2);
/* DONE */router.post('/updateReportFinal', db.check_user, db.updateReportFinal);
/* DONE */router.get('/updateReport', db.check_user, db.renderUpdateReport);
/* DONE */router.post('/confirmUpdateReport', db.check_user, db.newUpdateReport);

/* SCHEDULE */
/* DONE */router.get('/setSchedule', db.check_user, db.setSchedule);
/* DONE */router.post('/confirmSetSchedule', db.check_user, db.newSchedule);
/* DONE */router.post('/removeSchedule', db.check_user, db.deleteScheduleFinal);

//CHARTJS
router.get('/initialChart', db.check_user, db.chartInteractive);
router.get('/lastYear', db.check_user, db.getLastYear);
router.get('/lastMonth', db.check_user, db.getLastMonth);

//CALENDAR
/* DONE */router.get('/calendar', db.check_user, db.renderCalendar);

/* DONE */router.get('/success', db.check_user, db.renderSuccess);
/* DONE */router.get('/failed', db.check_user, db.renderFailed);
/* DONE */router.get('/restricted', db.check_user, db.renderRestricted);

/* DONE */router.get('/viewTransactionLog', db.check_user, db.displayTransactionLog);


/* RECORDS */
/* DONE */router.get('/viewRecords', db.check_user, db.viewRecords);
/* DONE */router.post('/displayRecords', db.check_user, db.displayRecords);

router.get('/generate-list/:niche_name', db.check_user, db.generateList);
router.get('/generate-report/:niche_name/:email_status/:campaign', db.check_user, db.generateReport);
router.get('/generate-records/:username/:date_added', db.check_user, db.generateRecords);
router.get('/generate-affiliates', db.check_user, db.generateAffiliates);
router.get('/generate-advertisers', db.check_user, db.generateAdvertisers);
router.get('/generate-influencers', db.check_user, db.generateInfluencers);


router.post('/upload', function(req, res, next){
  console.log("Upload Entry");
  // create an incoming form object
  var form = new formidable.IncomingForm();
  form.multiples = false;

  form.uploadDir = path.join(__dirname, '/../../../../../LAST');

  form.on('file', function(field, file) {
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });
  form.on('end', function() {
    res.end('success');
  });
  form.parse(req);
  
  console.log("SAVED TO C:");
  
});

//error-handling
router.get('*', function(err, req, res, next) {
  console.log("get ***");
  res.render('pagenotfound');
});

router.use('*',function(err, req, res, next) {
  console.log("OOPS! " + err.message);
  res.render('pagenotfound');
});

module.exports = router;
