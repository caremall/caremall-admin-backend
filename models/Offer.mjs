import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const offerSchema = new Schema(
  {
    offerTitle: {
      type: String,
      required: true,
      trim: true,
    },
    offerType: {
      type: String,
      enum: ['Discount', 'Percentage Offer', 'Buy One Get One', 'Free Shipping'],
      required: true,
    },
    offerPeriod: {
      start: {
        type: Date,
        required: false,
      },
      end: {
        type: Date,
        required: false,
      },
    },
    createdBy: {
      type: String, // or Schema.Types.ObjectId if you want to link to an Admin
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Drafts', 'Inactive'],
      default: 'Active',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Offer = model('Offer', offerSchema);
export default Offer;
