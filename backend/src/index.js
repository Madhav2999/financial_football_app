import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db/connection.js";

dotenv.config();

const app = express();
app.use(express.json());

// connect to MongoDB
connectDB();

// Example route
app.get("/", (req, res) => {
  res.send("API running...");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
