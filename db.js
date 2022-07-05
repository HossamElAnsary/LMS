const mongoose = require("mongoose");


const coursesSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.SchemaTypes.ObjectId
  },
	courseName: String,
	categoryName: String,
	instructorName: String,
  courseDescription: String,
  courseLevel: String,
	priceCourse: Number,
	duration: String,
  folderNames: [],
  usersEnrolled: [],
  courseData: [{}]

});

module.exports.Courses = mongoose.model("Courses", coursesSchema);

const offlineSchema = new mongoose.Schema({
  
	name: String,
	surname: String,
	mobileNumber: String,
  address: String,
  email: String,
	education: String,
	country: String,
  state: String,
  day: String,
  time: String,
});

module.exports.Offline = mongoose.model("Offline", offlineSchema);

const o6uSchema = new mongoose.Schema({
  
	o6uId: Number,
});

module.exports.O6u = mongoose.model("O6u", o6uSchema);

const instructorSchema = new mongoose.Schema({
  instructorId: {
    type: mongoose.SchemaTypes.ObjectId
  },
	name: String,
	jobTitle:String

});

module.exports.Instructor = mongoose.model("Instructor", instructorSchema);

const categorySchema = new mongoose.Schema({
  
	categoryName: String,
	numberOfCourses: Number,
	numberOfInstructor: Number

});

module.exports.Category = mongoose.model("Category", categorySchema);

const transactionsSchema = new mongoose.Schema({
  paymentInfo: {
    visaName:String,
    visaNum:String,
    expireDate:String,
    cvv:Number
  },
  studentId: String,
  courseId: String,
  priceCourse: String,
  transactionDate: {
    type: Date,
    default: () => Date.now()
  }
});

module.exports.Transactions = mongoose.model("Transactions", transactionsSchema);


const contactSchema = new mongoose.Schema({

	email: String,
	userName: String,
	subject: String,
	message: String

});

module.exports.Contact = mongoose.model("Contact", contactSchema);

const reportsSchema = new mongoose.Schema({

	userReport: {
    email: String,
    userName:String,
    hasRegistered: Boolean,
    RegisterationDate: Date
  },
  courseReport: {
    courseCategory: String,
    courseName: String,
    hasEnrolled: Boolean,
    user: {
      email: String,
      userName: String
    },
    EnrolledDate: Date,
    
  }

});

module.exports.Reports = mongoose.model("Reports", reportsSchema);
