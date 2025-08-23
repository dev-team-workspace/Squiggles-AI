import { NextApiRequest, NextApiResponse } from 'next';
import { checkIfUserIsAdmin, getAdminData, verifyIdToken } from '@/lib/firebase-admin-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Verify the ID token
    const decodedToken = await verifyIdToken(token);
    
    // Check if user is admin
    const isAdmin = await checkIfUserIsAdmin(decodedToken.uid);
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch admin data
    const data = await getAdminData();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Admin data fetch error:', error);
    
    // More specific error responses
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}