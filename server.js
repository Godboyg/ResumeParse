const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const userModel = require("./db/mongoose");
const axios = require('axios');
const bcrypt = require('bcryptjs');
const nodemailer = require("nodemailer");
require('dotenv').config();

const PORT = 5000;

app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.send("hello");
})

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
});


const verifyToken = (req, res, next) => {

    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(403).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.Secret);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};

app.post('/api/register', async (req, res) => {
    const { username , email , password , referral } = req.body;

    const user = await userModel.findOne({ email });

    if(user){
        return res.json({ message : "user found pls Login!"});
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const referralCode = Math.random().toString(36).substring(2, 8);

    let referredByUser = null;
    if (referral) {
        referredByUser = await userModel.findById(referral);
        if (!referredByUser) return res.status(400).json({ message: "Invalid referral code" });
    }

    const User = new userModel({
        username,
        email,
        hashedPassword,
        referralCode,
        referredBy: referredByUser ? referredByUser._id : null
    })

    if (referredByUser) {
        await userModel.findByIdAndUpdate(referredByUser._id, { $inc: { referrals: 1 } });
    }

    await User.save();
    res.json({ message : "A new user created", User});
});


app.post("/api/login",async(req,res)=>{

    const { userInfo , password } = req.body;

    const user = await userModel.findOne({$or : [{ username : userInfo } ,{ email : userInfo }]});

    if(!user){
        return res.json({ message : "invalid cridentials"})
    }

    const isPasswordMatch = await bcrypt.compare(password , user.password);

    if(!isPasswordMatch){
        // return res.json({ message : "wrong password "});
        return alert("wrong password");
    }

    const token = jwt.sign({ _id : user.id , email : user.email}, process.env.Secret , { 
        expiresIn : "1d"
    });

    res.cookie("auth_token",token,{
        httpOnly: true,
        sameSite: "Strict"
    });

    res.json({ message : "user logged in" , token});

})

app.post("/api/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) return res.status(400).json({ message: "User not found" });

        const token = jwt.sign({ id: user._id }, process.env.Secret , { expiresIn: "15m" });

        const resetLink = `http://localhost:3001/reset-password/${token}`; //frontend url

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Password Reset Request",
            html: `<p>Click the link below to reset your password:</p>
                   <a href="${resetLink}">Reset Password</a>
                   <p>This link is valid for 15 minutes.</p>`
        });

        res.json({ message: "Password reset link sent to your email" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const decoded = jwt.verify(token, process.env.Secret);
        const user = await userModel.findById(decoded.id);
        if (!user) return res.status(400).json({ message: "Invalid or expired token" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password reset successful! You can now log in." });

    } catch (error) {
        res.status(400).json({ message: "Invalid or expired token" });
    }
});

app.get("/api/referrals",verifyToken,async(req,res)=>{

    try {
        const referredUsers = await userModel.find({ referredBy: req.user.id })  
            .select("username email "); 

        res.json({ referredUsers });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
})

app.get("/referral-stats/:userId", async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ referrals: user.referrals });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT,()=>{
    console.log(`server connected ${PORT}`);
})