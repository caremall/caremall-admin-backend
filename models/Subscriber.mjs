import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const subscriberSchema = new Schema({
    email: {
    type: String,
    required: true,
    unique: true,
  },
  confirmed: {
    type: Boolean,
    default: false, 
  },
  confirmationToken: {
    type: String, 
    required: false,
  },
  

},{ timestamps: true });

const Subscriber = model('Subscriber', subscriberSchema);

export default Subscriber;