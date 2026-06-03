import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    pricePaid: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true }
  },
  orderNotes: { type: String },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'paid', 'failed'], 
    default: 'unpaid' 
  },
  paymentGateway: { type: String, default: 'none' },
  gatewayOrderId: { type: String, index: true },
  gatewayPaymentId: { type: String },
  idempotencyKey: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

OrderSchema.index({ createdAt: -1 });

const Order = mongoose.model('Order', OrderSchema);
export default Order;
