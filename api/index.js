import 'dotenv/config';
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Connect to database
await connectDB();

// Export for Vercel serverless
export default app;
