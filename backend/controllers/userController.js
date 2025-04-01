const { Op } = require('sequelize');
const { User, SeekerProfile, EmployerProfile, UserStatistics } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');

// 获取求职者个人资料
exports.getSeekerProfile = catchAsync(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const profile = await SeekerProfile.findOne({
    where: { user_id: userId },
    include: [{
      model: User,
      attributes: ['id', 'username', 'email', 'phone', 'avatar', 'role', 'status', 'last_login']
    }]
  });
  
  if (!profile) {
    return next(new AppError('未找到求职者个人资料', 404));
  }
  
  // 如果查看的不是自己的资料，且该资料未公开，则拒绝访问
  if (userId !== req.user.id && !profile.is_public && req.user.role !== 'admin') {
    return next(new AppError('该用户的个人资料未公开', 403));
  }
  
  // 如果不是本人或管理员，增加资料浏览数
  if (userId !== req.user.id && req.user.role !== 'admin') {
    // 更新统计数据
    await UserStatistics.increment('profile_views', {
      where: { user_id: userId }
    });
  }
  
  // 脱敏处理个人敏感信息（邮箱、电话等）
  const data = profile.toJSON();
  if (userId !== req.user.id && req.user.role !== 'admin' && data.User) {
    if (data.User.email) {
      data.User.email = maskEmail(data.User.email);
    }
    if (data.User.phone) {
      data.User.phone = maskPhone(data.User.phone);
    }
  }
  
  res.status(200).json({
    status: 'success',
    data
  });
});

// 更新求职者个人资料
exports.updateSeekerProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以更新求职者资料', 403));
  }
  
  // 查找现有资料
  const profile = await SeekerProfile.findOne({ where: { user_id: userId } });
  
  if (!profile) {
    return next(new AppError('未找到求职者个人资料', 404));
  }
  
  // 允许更新的字段
  const allowedFields = [
    'full_name', 'gender', 'birth_date', 'current_location',
    'education_level', 'school', 'major', 'graduation_year',
    'work_experience_years', 'skills', 'expected_salary_min',
    'expected_salary_max', 'job_preferences', 'is_public'
  ];
  
  // 过滤请求中的字段
  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });
  
  // 如果提供了技能或偏好，确保它们是正确的格式
  if (updateData.skills && typeof updateData.skills !== 'string') {
    updateData.skills = updateData.skills; // 会由模型的set方法处理
  }
  
  if (updateData.job_preferences && typeof updateData.job_preferences !== 'string') {
    updateData.job_preferences = updateData.job_preferences; // 会由模型的set方法处理
  }
  
  // 更新资料
  await profile.update(updateData);
  
  // 计算资料完成度
  const profileCompletion = calculateProfileCompletion(profile);
  
  // 更新用户统计信息
  await UserStatistics.update(
    { profile_completion: profileCompletion },
    { where: { user_id: userId }, upsert: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      profile
    }
  });
});

// 获取企业个人资料
exports.getEmployerProfile = catchAsync(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const profile = await EmployerProfile.findOne({
    where: { user_id: userId },
    include: [{
      model: User,
      attributes: ['id', 'username', 'email', 'avatar', 'role', 'status', 'last_login']
    }]
  });
  
  if (!profile) {
    return next(new AppError('未找到企业资料', 404));
  }
  
  // 脱敏处理企业联系人信息
  const data = profile.toJSON();
  if (userId !== req.user.id && req.user.role !== 'admin') {
    if (data.contact_email) {
      data.contact_email = maskEmail(data.contact_email);
    }
    if (data.contact_phone) {
      data.contact_phone = maskPhone(data.contact_phone);
    }
  }
  
  res.status(200).json({
    status: 'success',
    data
  });
});

// 更新企业个人资料
exports.updateEmployerProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  // 检查用户是否为企业用户
  if (req.user.role !== 'employer') {
    return next(new AppError('只有企业用户可以更新企业资料', 403));
  }
  
  // 查找现有资料
  const profile = await EmployerProfile.findOne({ where: { user_id: userId } });
  
  if (!profile) {
    return next(new AppError('未找到企业资料', 404));
  }
  
  // 允许更新的字段
  const allowedFields = [
    'company_name', 'industry', 'company_size', 'founded_year',
    'company_website', 'company_description', 'headquarters_location',
    'contact_person', 'contact_position', 'contact_email', 'contact_phone'
  ];
  
  // 过滤请求中的字段
  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });
  
  // 更新资料
  await profile.update(updateData);
  
  // 计算资料完成度
  const profileCompletion = calculateEmployerProfileCompletion(profile);
  
  // 更新用户统计信息
  await UserStatistics.update(
    { profile_completion: profileCompletion },
    { where: { user_id: userId }, upsert: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      profile
    }
  });
});

// 更新用户信息（如用户名、手机号）
exports.updateUser = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  // 允许更新的字段
  const allowedFields = ['username', 'phone'];
  
  // 过滤请求中的字段
  const updateData = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updateData[key] = req.body[key];
    }
  });
  
  // 检查用户名是否已存在
  if (updateData.username) {
    const existingUser = await User.findOne({
      where: {
        username: updateData.username,
        id: { [Op.ne]: userId }
      }
    });
    
    if (existingUser) {
      return next(new AppError('该用户名已被使用', 400));
    }
  }
  
  // 更新用户信息
  const updatedUser = await User.update(updateData, {
    where: { id: userId },
    returning: true
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser[1][0]
    }
  });
});

// 上传头像
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('请上传头像文件', 400));
  }
  
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  
  // 更新用户头像
  await User.update(
    { avatar: avatarUrl },
    { where: { id: req.user.id } }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      avatar: avatarUrl
    }
  });
});

// 上传简历
exports.uploadResume = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('请上传简历文件', 400));
  }
  
  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以上传简历', 403));
  }
  
  const resumeUrl = `/uploads/resumes/${req.file.filename}`;
  
  // 更新求职者资料中的简历URL
  await SeekerProfile.update(
    { resume_url: resumeUrl },
    { where: { user_id: req.user.id } }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      resume_url: resumeUrl
    }
  });
});

// 上传企业logo
exports.uploadCompanyLogo = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('请上传企业LOGO', 400));
  }
  
  // 检查用户是否为企业用户
  if (req.user.role !== 'employer') {
    return next(new AppError('只有企业用户可以上传公司LOGO', 403));
  }
  
  const logoUrl = `/uploads/logos/${req.file.filename}`;
  
  // 更新企业资料中的LOGO URL
  await EmployerProfile.update(
    { company_logo: logoUrl },
    { where: { user_id: req.user.id } }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      company_logo: logoUrl
    }
  });
});

// 工具函数 - 计算求职者资料完成度
const calculateProfileCompletion = (profile) => {
  const fields = [
    'full_name', 'gender', 'birth_date', 'current_location',
    'education_level', 'school', 'major', 'graduation_year',
    'work_experience_years', 'skills', 'resume_url',
    'expected_salary_min', 'expected_salary_max', 'job_preferences'
  ];
  
  let completedFields = 0;
  fields.forEach(field => {
    if (profile[field] && 
      (typeof profile[field] !== 'string' || profile[field].trim() !== '') &&
      (field !== 'skills' || (Array.isArray(profile.skills) && profile.skills.length > 0)) &&
      (field !== 'job_preferences' || (Object.keys(profile.job_preferences).length > 0))
    ) {
      completedFields++;
    }
  });
  
  return Math.round((completedFields / fields.length) * 100);
};

// 工具函数 - 计算企业资料完成度
const calculateEmployerProfileCompletion = (profile) => {
  const fields = [
    'company_name', 'company_logo', 'industry', 'company_size',
    'founded_year', 'company_website', 'company_description',
    'headquarters_location', 'contact_person', 'contact_position',
    'contact_email', 'contact_phone'
  ];
  
  let completedFields = 0;
  fields.forEach(field => {
    if (profile[field] && (typeof profile[field] !== 'string' || profile[field].trim() !== '')) {
      completedFields++;
    }
  });
  
  return Math.round((completedFields / fields.length) * 100);
};

// 工具函数 - 邮箱脱敏
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

// 工具函数 - 手机号脱敏
const maskPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}; 