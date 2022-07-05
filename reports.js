const express = require('express');
const router = express.Router();
const db = require(__dirname + "/db");



router.get("/", (req, res) => {
    res.render("chooseReport");
  });

router.get("/userReport", (req, res) => {
    db.Reports.find({}, (err, reports) => {
        let arr = [];
        if(!err) {
            reports.forEach((report) => {
             if (report.userReport) {
                arr.push(report.userReport);
             }
            });
            res.render("reportsUser", {reports: arr});
        } else {
            console.log(err);
        }
    });
});
// router.get("/:report", (req, res) => {
  
//     if("userReport" === req.params.report) {
//       db.Reports.find({}, (err,reports) => {
//         let arr = [];
//         if(!err) {
//           reports.forEach((report) => {
//             if(report.userReport)
//             arr.push(report.userReport);
//           });
//           res.render("reportsUser", {reports: arr});
//         } else {
//           console.log(err);
//         }
//       });
//     } else if("courseReport" === req.params.report) {
//       db.Reports.find({}, (err,reports) => {
//         let arr = [];
//         if(!err) {
//           reports.forEach((report) => {
//             if(report.courseReport)
//             arr.push(report.courseReport);
//           });
//           res.render("reportsCourse", {reports: arr});
//         } else {
//           console.log(err);
//         }
//       });
//     } else {
  
//       db.Transactions.find({}, (err, transactions) => {
//         if (!err) {
//           res.render("reportsTransaction", {reports: transactions});
//         } else {
//           console.log(err);
//         }
//       });
  
//     }
    
//   });

module.exports = router;