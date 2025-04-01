const fs = require('fs');
const path = require('path');
const { Resume, User } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { extractResumeData } = require('../utils/resumeParserUtils');

// 上传简历
exports.uploadResume = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('请上传简历文件', 400));
  }

  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    return next(new AppError('只有求职者可以上传简历', 403));
  }

  // 检查文件类型
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const fileExt = path.extname(req.file.originalname).toLowerCase();
  
  if (!allowedTypes.includes(fileExt)) {
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    return next(new AppError('只支持PDF, DOC, DOCX格式的文件', 400));
  }

  // 文件保存路径
  const fileName = `resume_${req.user.id}_${Date.now()}${fileExt}`;
  const filePath = path.join('uploads', 'resumes', fileName);
  const fullPath = path.join(__dirname, '..', filePath);
  
  // 确保目录存在
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 移动文件
  fs.copyFileSync(req.file.path, fullPath);
  fs.unlinkSync(req.file.path); // 删除临时文件
  
  // 获取简历标题，默认使用原始文件名
  let title = req.body.title || path.basename(req.file.originalname, fileExt);
  
  // 创建简历记录
  const resume = await Resume.create({
    user_id: req.user.id,
    title,
    file_url: `/uploads/resumes/${fileName}`,
    file_name: req.file.originalname,
    file_type: fileExt.replace('.', ''),
    file_size: req.file.size,
    is_default: req.body.is_default === 'true',
    parse_status: 'pending'
  });
  
  // 如果设置为默认简历，需要将其他简历设置为非默认
  if (resume.is_default) {
    await Resume.update(
      { is_default: false },
      { 
        where: { 
          user_id: req.user.id,
          id: { [Op.ne]: resume.id }
        }
      }
    );
  }
  
  // 异步解析简历
  extractResumeData(resume.id, fullPath, fileExt)
    .then(() => {
      console.log(`简历 ${resume.id} 解析完成`);
    })
    .catch(err => {
      console.error(`简历 ${resume.id} 解析失败:`, err);
    });
  
  res.status(201).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 获取简历列表
exports.getResumes = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;
  
  // 权限检查
  if (userId !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看其他用户的简历', 403));
  }
  
  const resumes = await Resume.findAll({
    where: { 
      user_id: userId,
      status: { [Op.ne]: 'deleted' }
    },
    order: [
      ['is_default', 'DESC'],
      ['updatedAt', 'DESC']
    ]
  });
  
  res.status(200).json({
    status: 'success',
    results: resumes.length,
    data: {
      resumes
    }
  });
});

// 获取简历详情
exports.getResume = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (
    resume.user_id !== req.user.id && 
    req.user.role !== 'admin' && 
    (!resume.is_public || req.user.role !== 'employer')
  ) {
    return next(new AppError('您没有权限查看此简历', 403));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 设置默认简历
exports.setDefaultResume = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能设置自己的简历为默认', 403));
  }
  
  // 将其他简历设置为非默认
  await Resume.update(
    { is_default: false },
    {
      where: {
        user_id: req.user.id,
        id: { [Op.ne]: id }
      }
    }
  );
  
  // 设置当前简历为默认
  resume.is_default = true;
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 更新简历信息
exports.updateResume = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 更新简历信息
  const allowedFields = ['title', 'is_public', 'extracted_skills', 'extracted_education', 'extracted_experience'];
  
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      resume[key] = req.body[key];
    }
  });
  
  // 如果设置为默认
  if (req.body.is_default === 'true') {
    await Resume.update(
      { is_default: false },
      {
        where: {
          user_id: req.user.id,
          id: { [Op.ne]: id }
        }
      }
    );
    resume.is_default = true;
  }
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 删除简历
exports.deleteResume = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限删除此简历', 403));
  }
  
  // 如果是默认简历，需要先设置另一个简历为默认
  if (resume.is_default) {
    const otherResume = await Resume.findOne({
      where: {
        user_id: resume.user_id,
        id: { [Op.ne]: id },
        status: { [Op.ne]: 'deleted' }
      }
    });
    
    if (otherResume) {
      otherResume.is_default = true;
      await otherResume.save();
    }
  }
  
  // 标记为已删除
  resume.status = 'deleted';
  await resume.save();
  
  // 物理删除文件（可选）
  try {
    if (resume.file_url) {
      const filePath = path.join(__dirname, '..', resume.file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error('删除简历文件失败:', error);
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
}); 