import mongoose from 'mongoose';

const SecurityEventSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  ip: { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'brute_force', 
      'login_abuse', 
      'credential_stuffing', 
      'reservation_abuse', 
      'cart_abuse', 
      'api_scraping', 
      'rate_limit_violation', 
      'admin_probe', 
      'suspicious_ip',
      'bulk_modification_anomaly',
      'connection_spike',
      'slow_query_anomaly',
      'db_deletion_anomaly'
    ],
    index: true
  },
  severity: { 
    type: String, 
    required: true, 
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  threatScore: { type: Number, required: true, default: 0 },
  details: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Auto-expire old security logs after 30 days to limit space consumption
SecurityEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const SecurityEvent = mongoose.model('SecurityEvent', SecurityEventSchema);
export default SecurityEvent;
