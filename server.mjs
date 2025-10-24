import express from "express";
import { configDotenv } from "dotenv";
import connectDB from "./connections/mongoConnect.mjs";
import mongoose from "mongoose";
import corsOptions from "./config/cors/corsOptions.mjs";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import router from "./routes/index.mjs";
import errorHandler from "./middlewares/errorHandler.mjs";


const app = express();

configDotenv();
connectDB(process.env.DATABASE_URI);


app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/", router);

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
  });
});


app.use(errorHandler);

mongoose.connection.once("open", () => {
  app.listen(process.env.PORT, () =>
    console.log(`🌎 - Listening On http://localhost:${process.env.PORT} -🌎`)
  );
});

export default app;
