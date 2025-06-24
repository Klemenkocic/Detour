import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'detour-5e24b',
  });
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // For development, you can temporarily skip token verification
    // TODO: Remove this in production!
    if (process.env.SKIP_AUTH === 'true') {
      console.log('⚠️  Auth verification skipped (SKIP_AUTH=true)');
      (req as any).user = { uid: 'test-user' };
      next();
      return;
    }
    
    try {
      // Verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(token);
      // Add user info to request
      (req as any).user = decodedToken;
      next();
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      if (error.code === 'auth/argument-error') {
        res.status(401).json({ error: 'Invalid token format' });
      } else {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}; 