import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import messageRoutes from "./routes/message.routes.js";
import userRoutes from "./routes/user.routes.js";
import keyExchangeRoutes from "./routes/keyExchange.routes.js";
import securityRoutes from "./routes/security.routes.js";
import fileRoutes from "./routes/file.routes.js";
import mitmRoutes from "./routes/mitm.routes.js";

import connectToMongoDB from "./db/connectToMongoDB.js";


const app = express();
const PORT = process.env.PORT || 3005;

dotenv.config();

app.use(express.json());//to parse the incoming requests with JSON payloads (from req.body)
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/keyexchange", keyExchangeRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/mitm", mitmRoutes);

//app.get('/', (req, res) => {
// root route http://localhost:5000/
//  res.send("Hello World!a");
//});
//start the server
app.listen(PORT, () => {
    connectToMongoDB();
    console.log(`Server Running on port ${PORT}`);
});