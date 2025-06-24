import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/payments';

const app = express();

// Check environment variables on startup
console.log('🔍 Checking environment variables...');
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('📝 Please create server/.env file with the required variables');
} else {
  console.log('✅ All required environment variables are set');
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (missingVars.length > 0) {
    console.log('⚠️  Warning: Server is running but some features may not work due to missing env vars');
  }
}); 