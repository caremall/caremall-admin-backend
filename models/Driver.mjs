import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const driverSchema = new mongoose.Schema(
  {
   
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    email:{
        type: String,
    },
    password:{
        type: String,
    },
    area: {
      type: String,
      required: false,
    },
    vehicleNumber: {
      type: String,
      required: true, 
      trim: true,
    },
    notes:{
        type: String,
    }
  },
  { timestamps: true }
);

const Driver = model('Driver', driverSchema);
export default Driver;