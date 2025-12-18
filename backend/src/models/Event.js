import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  location: String,
  event_date: {
    type: Date,
    required: true,
  },
  organizer_wallet: {
    type: String,
    required: true,
  },
  nft_image_url: String,
  nft_metadata_uri: String,
  max_claims: {
    type: Number,
    default: 1000,
  },
  claim_code: {
    type: String,
    required: true,
    unique: true,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const transform = (_doc, ret) => {
  ret.id = ret._id?.toString?.() ?? ret._id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

eventSchema.set('toJSON', { transform });
eventSchema.set('toObject', { transform });

eventSchema.index({ organizer_wallet: 1 });

export default mongoose.model('Event', eventSchema);
