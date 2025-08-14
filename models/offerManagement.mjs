import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const offerSchema = new Schema({
    offerTitle: {
      type: String,
      trim: true,
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerDescription: {
      type: String,
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerType: {
      type: String,
      enum: ['product', 'category', 'brand', 'cart'],
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerDiscountUnit: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerDiscountValue: {
      type: Number,
      min: 0,
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerMinimumOrderValue: {
      type: Number,
      min: 0,
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerImageUrl: {
      type: String,
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerRedeemTimePeriod: {
      type: [Date], // [startDate, endDate]
      validate: {
        validator: function (arr) {
          if (this.offerStatus === 'draft') return true; // skip validation in draft
          return Array.isArray(arr) && arr.length === 2 && arr.every(d => d instanceof Date && !isNaN(d));
        },
        message: 'Booking dates must include both valid start and end dates',
      },
      required: function () {
        return this.offerStatus !== 'draft';
      }
    },
    offerEligibleItems: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    isOfferFeatured: {
      type: Boolean,
      default: false,
    },
    offerStatus: {
      type: String,
      enum: ['draft', 'published', 'inactive'],
      default: 'draft',
    },
    offerAuthor: {
      type: String,
      required: true,
      default: 'Admin',
      trim: true,
    },
  },
  {
    timestamps: true,
  });


const Offer = model('Offer', offerSchema);
export default Offer;
