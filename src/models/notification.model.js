import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['order', 'inventory', 'system'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-purge notifications older than 30 days to protect database capacity limits
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Optimize descending sorts on notifications
NotificationSchema.index({ createdAt: -1 });

// Optimize read filter queries
NotificationSchema.index({ read: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
