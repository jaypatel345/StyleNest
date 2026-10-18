import mongoose from "mongoose";

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.log("MongoDB info: MONGODB_URI is not configured in .env (running without DB)");
        return;
    }
    try {
        mongoose.connection.on('connected',() => {
            console.log("DB Connected");
        })
        await mongoose.connect(`${process.env.MONGODB_URI}/e-commerce`)
    } catch (err) {
        console.log("DB Connection notice:", err.message);
    }
}

export default connectDB;