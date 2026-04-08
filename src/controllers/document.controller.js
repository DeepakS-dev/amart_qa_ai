import { Document } from '../models/Document.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDocuments = asyncHandler(async (_req, res) => {
  const documents = await Document.find().sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, data: documents });
});
