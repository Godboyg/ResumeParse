const mongoose = require("mongoose");
require('dotenv').config();

mongoose.connect(process.env.DB_URL).then(()=>{
    console.log("db connected");
});

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password :{
        type: String,
        required: true
    },
    referralCode: { type: String, unique: true }, 
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referrals: { type: Number, default: 0 }
})

const User = mongoose.model("User", userSchema);

module.exports = User;