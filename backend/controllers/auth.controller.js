import bcrypt from "bcryptjs"
import User from "../models/user.model.js";
import generateTokenAndSetCookie from "../utils/generateToken.js";
import { logAuthenticationAttempt } from "../utils/securityLogger.js";

export const signup = async (req, res) => {
    try {
        const { fullName, username, password, confirmPassword, gender, publicKey } = req.body;

        if (!publicKey) {
            return res.status(400).json({ error: "Public key is required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords don't match" });
        }

        const user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate Profile Picture
        const boyProfilePic = `https://avatar.iran.liara.run/public/boy?username=${username}`;
        const girlProfilePic = `https://avatar.iran.liara.run/public/girl?username=${username}`;

        const newUser = new User({
            fullName,
            username,
            password: hashedPassword,
            gender,
            publicKey,
            profilePic: gender === "male" ? boyProfilePic : girlProfilePic
        });

        if (newUser) {
            generateTokenAndSetCookie(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                username: newUser.username,
                profilePic: newUser.profilePic
            });
        } else {
            res.status(400).json({ error: "Invalid user data" });
        }

    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const login = async (req, res) => {
    try {

        const { username, password } = req.body;

        const user = await User.findOne({ username });


        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if (!user || !isPasswordCorrect) {
            // Log failed authentication attempt
            const ipAddress = req.ip || req.connection.remoteAddress;
            logAuthenticationAttempt(user?._id?.toString() || 'unknown', username, false, ipAddress);
            return res.status(400).json({ error: "Invalid username or password" });
        }

        // Log successful authentication
        const ipAddress = req.ip || req.connection.remoteAddress;
        logAuthenticationAttempt(user._id.toString(), user.username, true, ipAddress);

        generateTokenAndSetCookie(user._id, res);
        //const token = generateTokenAndSetCookie(user._id, res);
        //console.log("Generated JWT token:", token);



        res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            profilePic: user.profilePic,
            publicKey: user.publicKey, // Include public key for key pair verification
        });
    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.log("Error in logout controller", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};