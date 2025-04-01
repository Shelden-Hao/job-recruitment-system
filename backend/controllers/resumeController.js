const fs = require('fs');
const path = require('path');
const { Resume, User } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { extractResumeData } = require('../utils/resumeParserUtils');
const { Op } = require('sequelize');

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

// 获取当前用户的简历列表
exports.getMyResumes = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
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

// 创建空白简历
exports.createResume = catchAsync(async (req, res, next) => {
  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以创建简历', 403));
  }
  
  // 获取简历标题
  let title = req.body.title || `我的简历 ${new Date().toLocaleDateString()}`;
  
  // 创建简历记录
  const resume = await Resume.create({
    user_id: req.user.id,
    title,
    is_default: req.body.is_default === 'true',
    status: 'active'
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
  
  res.status(201).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 更新基本信息
exports.updateBasicInfo = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 更新简历基本信息
  const allowedFields = ['name', 'phone', 'email', 'date_of_birth', 'gender', 'current_location', 'position', 'objective'];
  
  // 确保basic_info是对象
  if (!resume.basic_info) {
    resume.basic_info = {};
  }
  
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      resume.basic_info[key] = req.body[key];
    }
  });
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      resume
    }
  });
});

// 添加教育经历
exports.addEducation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保education是数组
  if (!resume.education) {
    resume.education = [];
  }
  
  // 添加教育经历
  const education = {
    id: Date.now().toString(), // 生成唯一ID
    school: req.body.school,
    degree: req.body.degree,
    field_of_study: req.body.field_of_study,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    gpa: req.body.gpa,
    description: req.body.description,
    activities: req.body.activities,
    is_current: req.body.is_current === 'true'
  };
  
  resume.education.push(education);
  await resume.save();
  
  res.status(201).json({
    status: 'success',
    data: {
      education
    }
  });
});

// 更新教育经历
exports.updateEducation = catchAsync(async (req, res, next) => {
  const { id, eduId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保education是数组
  if (!resume.education) {
    return next(new AppError('教育经历不存在', 404));
  }
  
  // 查找并更新教育经历
  const eduIndex = resume.education.findIndex(edu => edu.id === eduId);
  if (eduIndex === -1) {
    return next(new AppError('教育经历不存在', 404));
  }
  
  const allowedFields = ['school', 'degree', 'field_of_study', 'start_date', 'end_date', 'gpa', 'description', 'activities', 'is_current'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      resume.education[eduIndex][field] = req.body[field];
    }
  });
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      education: resume.education[eduIndex]
    }
  });
});

// 删除教育经历
exports.deleteEducation = catchAsync(async (req, res, next) => {
  const { id, eduId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保education是数组
  if (!resume.education) {
    return next(new AppError('教育经历不存在', 404));
  }
  
  // 查找并删除教育经历
  const eduIndex = resume.education.findIndex(edu => edu.id === eduId);
  if (eduIndex === -1) {
    return next(new AppError('教育经历不存在', 404));
  }
  
  resume.education.splice(eduIndex, 1);
  await resume.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 添加工作经历
exports.addWorkExperience = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保work_experience是数组
  if (!resume.work_experience) {
    resume.work_experience = [];
  }
  
  // 添加工作经历
  const work = {
    id: Date.now().toString(), // 生成唯一ID
    company: req.body.company,
    position: req.body.position,
    location: req.body.location,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    description: req.body.description,
    achievements: req.body.achievements,
    is_current: req.body.is_current === 'true'
  };
  
  resume.work_experience.push(work);
  await resume.save();
  
  res.status(201).json({
    status: 'success',
    data: {
      work_experience: work
    }
  });
});

// 更新工作经历
exports.updateWorkExperience = catchAsync(async (req, res, next) => {
  const { id, workId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保work_experience是数组
  if (!resume.work_experience) {
    return next(new AppError('工作经历不存在', 404));
  }
  
  // 查找并更新工作经历
  const workIndex = resume.work_experience.findIndex(work => work.id === workId);
  if (workIndex === -1) {
    return next(new AppError('工作经历不存在', 404));
  }
  
  const allowedFields = ['company', 'position', 'location', 'start_date', 'end_date', 'description', 'achievements', 'is_current'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      resume.work_experience[workIndex][field] = req.body[field];
    }
  });
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      work_experience: resume.work_experience[workIndex]
    }
  });
});

// 删除工作经历
exports.deleteWorkExperience = catchAsync(async (req, res, next) => {
  const { id, workId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保work_experience是数组
  if (!resume.work_experience) {
    return next(new AppError('工作经历不存在', 404));
  }
  
  // 查找并删除工作经历
  const workIndex = resume.work_experience.findIndex(work => work.id === workId);
  if (workIndex === -1) {
    return next(new AppError('工作经历不存在', 404));
  }
  
  resume.work_experience.splice(workIndex, 1);
  await resume.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 添加项目经历
exports.addProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保projects是数组
  if (!resume.projects) {
    resume.projects = [];
  }
  
  // 添加项目经历
  const project = {
    id: Date.now().toString(), // 生成唯一ID
    name: req.body.name,
    role: req.body.role,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    description: req.body.description,
    technologies: req.body.technologies,
    url: req.body.url,
    is_current: req.body.is_current === 'true'
  };
  
  resume.projects.push(project);
  await resume.save();
  
  res.status(201).json({
    status: 'success',
    data: {
      project
    }
  });
});

// 更新项目经历
exports.updateProject = catchAsync(async (req, res, next) => {
  const { id, projectId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保projects是数组
  if (!resume.projects) {
    return next(new AppError('项目经历不存在', 404));
  }
  
  // 查找并更新项目经历
  const projectIndex = resume.projects.findIndex(project => project.id === projectId);
  if (projectIndex === -1) {
    return next(new AppError('项目经历不存在', 404));
  }
  
  const allowedFields = ['name', 'role', 'start_date', 'end_date', 'description', 'technologies', 'url', 'is_current'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      resume.projects[projectIndex][field] = req.body[field];
    }
  });
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      project: resume.projects[projectIndex]
    }
  });
});

// 删除项目经历
exports.deleteProject = catchAsync(async (req, res, next) => {
  const { id, projectId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保projects是数组
  if (!resume.projects) {
    return next(new AppError('项目经历不存在', 404));
  }
  
  // 查找并删除项目经历
  const projectIndex = resume.projects.findIndex(project => project.id === projectId);
  if (projectIndex === -1) {
    return next(new AppError('项目经历不存在', 404));
  }
  
  resume.projects.splice(projectIndex, 1);
  await resume.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 添加技能
exports.addSkill = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保skills是数组
  if (!resume.skills) {
    resume.skills = [];
  }
  
  // 添加技能
  const skill = {
    id: Date.now().toString(), // 生成唯一ID
    name: req.body.name,
    level: req.body.level,
    years: req.body.years,
    description: req.body.description
  };
  
  resume.skills.push(skill);
  await resume.save();
  
  res.status(201).json({
    status: 'success',
    data: {
      skill
    }
  });
});

// 更新技能
exports.updateSkill = catchAsync(async (req, res, next) => {
  const { id, skillId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保skills是数组
  if (!resume.skills) {
    return next(new AppError('技能不存在', 404));
  }
  
  // 查找并更新技能
  const skillIndex = resume.skills.findIndex(skill => skill.id === skillId);
  if (skillIndex === -1) {
    return next(new AppError('技能不存在', 404));
  }
  
  const allowedFields = ['name', 'level', 'years', 'description'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      resume.skills[skillIndex][field] = req.body[field];
    }
  });
  
  await resume.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      skill: resume.skills[skillIndex]
    }
  });
});

// 删除技能
exports.deleteSkill = catchAsync(async (req, res, next) => {
  const { id, skillId } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id) {
    return next(new AppError('您只能更新自己的简历', 403));
  }
  
  // 确保skills是数组
  if (!resume.skills) {
    return next(new AppError('技能不存在', 404));
  }
  
  // 查找并删除技能
  const skillIndex = resume.skills.findIndex(skill => skill.id === skillId);
  if (skillIndex === -1) {
    return next(new AppError('技能不存在', 404));
  }
  
  resume.skills.splice(skillIndex, 1);
  await resume.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 导出简历
exports.exportResume = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const resume = await Resume.findByPk(id);
  
  if (!resume) {
    return next(new AppError('简历不存在', 404));
  }
  
  // 权限检查
  if (resume.user_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限导出此简历', 403));
  }
  
  // 如果有文件URL，直接返回
  if (resume.file_url) {
    return res.status(200).json({
      status: 'success',
      data: {
        resume,
        download_url: resume.file_url
      }
    });
  }
  
  // 否则生成PDF
  // 这里只是一个示例，实际生成PDF的代码需要根据实际情况实现
  // 通常会使用如puppeteer等库生成PDF
  
  res.status(200).json({
    status: 'success',
    data: {
      resume,
      message: '暂不支持在线生成简历，请上传简历文件'
    }
  });
}); 