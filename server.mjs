import express from 'express';
import connectDB from './connections/mongoConnect.mjs';
import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import corsOptions from './config/cors/corsOptions.mjs';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';


import uploadRouter from './routes/upload.router.mjs'
import authRouter from './routes/auth.router.mjs';
import roleRouter from './routes/role.router.mjs';
import adminRouter from './routes/admins.router.mjs'
import categoryRouter from './routes/category.router.mjs'
import brandRouter from './routes/brands.router.mjs'
import productsRouter from './routes/products.routes.mjs'

const app = express();


configDotenv()
connectDB(process.env.DATABASE_URI);

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))
app.use(cookieParser())


app.use('/upload', uploadRouter)
app.use('/auth', authRouter)
app.use('/roles', roleRouter)
app.use('/admins', adminRouter)
app.use('/categories', categoryRouter)
app.use('/brands', brandRouter)
app.use('/products', productsRouter)


mongoose.connection.once('open', () => {
    app.listen(process.env.PORT, () => console.log(`🌎 - Listening On http://localhost:${process.env.PORT} -🌎`)
    )
})


export default app;