import express from "express";
import connectDB from "./connections/mongoConnect.mjs";
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import corsOptions from "./config/cors/corsOptions.mjs";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes/index.mjs";
import errorHandler from "./utils/errorHandler.mjs";

const app = express();

configDotenv();
connectDB(process.env.DATABASE_URI);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/", router);

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
  });
});


app.use((err, req, res, next) => {
  console.error("Error:", err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.use(errorHandler);

mongoose.connection.once("open", () => {
  app.listen(process.env.PORT, () =>
    console.log(`🌎 - Listening On http://localhost:${process.env.PORT} -🌎`)
  );
});

export default app;
