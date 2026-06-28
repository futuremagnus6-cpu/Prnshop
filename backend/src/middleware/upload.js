const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

// Multer config for blog media (images + videos)
const blogMediaFilter = (_req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|webm|mov|avi|mkv/;
  const ext = path.extname(file.originalname).toLowerCase();
  const extname = imageTypes.test(ext) || videoTypes.test(ext);
  const isImage = imageTypes.test(file.mimetype);
  const isVideo = videoTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

  if (extname && (isImage || isVideo)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpeg, jpg, png, gif, webp) and video (mp4, webm, mov) files are allowed.'), false);
  }
};

const uploadBlogMedia = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: blogMediaFilter,
});

// Separate multer config for importing products (CSV/JSON files)
const importFileFilter = (_req, file, cb) => {
  const allowedExts = /csv|json/;
  const extname = allowedExts.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /text\/csv|application\/json|application\/vnd\.ms-excel/.test(file.mimetype);

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and JSON files are allowed for import.'), false);
  }
};

const uploadImport = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for imports
  fileFilter: importFileFilter,
});

// Multer config for fund request proof files (images + PDF)
const proofFileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG) and PDF files are allowed for proof uploads.'), false);
  }
};

const uploadProof = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: proofFileFilter,
});

module.exports = upload;
module.exports.uploadImport = uploadImport;
module.exports.uploadBlogMedia = uploadBlogMedia;
module.exports.uploadProof = uploadProof;
