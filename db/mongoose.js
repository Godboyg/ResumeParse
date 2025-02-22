const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/neoBuild").then(()=>{
    console.log("db connected");
});

const experienceSchema = new mongoose.Schema({
    job_title: {
        type: String
    },
    company:{
        type: String
    },
    start_date:{
        type: String
    },
    end_date:{
        type: String
    }
})

const educationSchema = new mongoose.Schema({
        degree:{
            type: String
        },
        branch:{
            type: String
        },
        institution:{
            type: String
        },
        year:{
            type: String
        }
})

const TextSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:
    [{
        type: String,
        required: true
    }],
    education: [educationSchema],
    experience: [experienceSchema],
    summary: String,
    skills:[String]
})

const text = mongoose.model("text", TextSchema);

module.exports = text;