const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errorMiddleware');

// 确保上传目录存在
const createUploadDirectory = (dir) => {
  const uploadPath = path.join(__dirname, '..', 'uploads', dir);
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

// 配置文件存储
const storage = (dir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = createUploadDirectory(dir);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 生成文件名：uuid + 原始扩展名
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

// 验证文件类型
const fileFilter = (allowedTypes) => (req, file, cb) => {
  const mimeType = file.mimetype.toLowerCase();
  if (allowedTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new AppError(`不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`, 400), false);
  }
};

// 简历上传配置
const resumeUpload = multer({
  storage: storage('resumes'),
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 }, // 默认5MB
  fileFilter: fileFilter(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
});

// 头像上传配置
const avatarUpload = multer({
  storage: storage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
});

// 公司LOGO上传配置
const logoUpload = multer({
  storage: storage('logos'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'])
});

// 聊天图片上传配置
const chatImageUpload = multer({
  storage: storage('chat_images'),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/jpg', 'image/gif'])
});

// 聊天文件上传配置
const chatFileUpload = multer({
  storage: storage('chat_files'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
});

module.exports = {
  resumeUpload,
  avatarUpload,
  logoUpload,
  chatImageUpload,
  chatFileUpload
}; 