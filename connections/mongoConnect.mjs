import mongoose from "mongoose";

const connectDB = async (DATABASE_URL) => {

    mongoose.set('strictQuery', false)
    try {
        await mongoose.connect(DATABASE_URL)
        console.log('🔌🔌🔌Database connected successfully🔌🔌🔌');
    } catch (err) {
        console.log(err);
    }

}

export default connectDB