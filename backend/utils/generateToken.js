import jwt from 'jsonwebtoken';

const generateTokenAndSetCookie = (userId, res) => {
    // Generate a JWT with a 15-day expiration
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15d' });

    // Set the JWT as a cookie with security measures
    res.cookie('jwt', token, {

        //maxAge: 30 * 1000,
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
        httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
        sameSite: 'strict', // Restrict cookie to same-site requests
        secure: process.env.NODE_ENV !== "development"
    });
};

export default generateTokenAndSetCookie;