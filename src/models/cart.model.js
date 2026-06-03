import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, default: 1 }
  }],
  cartValue: { type: Number, required: true, default: 0 },
  lastActivity: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

// Auto-expire cart documents after 30 days of inactivity to prevent database storage bloat
CartSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 2592000 });

const Cart = mongoose.model('Cart', CartSchema);
export default Cart;
