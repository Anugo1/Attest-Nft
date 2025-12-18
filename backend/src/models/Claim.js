import mongoose from 'mongoose';

const claimSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  wallet_address: {
    type: String,
    required: true,
  },
  mint_address: String,
  signature: String,
  status: {
    type: String,
    enum: ['pending', 'minting', 'completed', 'failed'],
    default: 'pending',
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

claimSchema.set('toJSON', { transform });
claimSchema.set('toObject', { transform });

claimSchema.index({ event_id: 1 });
claimSchema.index({ wallet_address: 1 });
claimSchema.index({ event_id: 1, wallet_address: 1 }, { unique: true });

export default mongoose.model('Claim', claimSchema);
