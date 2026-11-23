// -------------------------------------------------
// Image upload route
//   POST / — upload a product image, return its URL
// -------------------------------------------------

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Ensure the upload directory exists
const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage — saves with a unique filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp|jfif)$/i.test(file.originalname);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an image file (JPEG, PNG, WebP, GIF, AVIF, or BMP)'));
    }
  },
});

// POST /api/v1/upload — requires admin auth
router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Failed to upload image' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    res.json({
      url: `/uploads/${req.file.filename}`,
      file: { filename: req.file.filename, url: `/uploads/${req.file.filename}` },
    });
  });
});

export default router;
