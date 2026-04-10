import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export const IMAGE_UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const imageUploadMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: IMAGE_UPLOAD_MAX_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new BadRequestException('INVALID_IMAGE_TYPE'), false);
      return;
    }

    callback(null, true);
  },
};
