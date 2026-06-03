import mongoose from 'mongoose';

const ReservationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  reservedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  maxExpiresAt: { type: Date, required: true },
  extensionCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active', index: true },
  expiringSoonEmailSent: { type: Boolean, default: false },
  deleteAt: { type: Date }
}, { timestamps: true });

// TTL index on deleteAt to remove processed records automatically
ReservationSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

// Compound unique index to prevent duplicate active reservations for the same user/product
ReservationSchema.index(
  { userId: 1, productId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

const Reservation = mongoose.model('Reservation', ReservationSchema);
export default Reservation;
