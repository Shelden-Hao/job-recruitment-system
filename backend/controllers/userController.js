const { Op } = require('sequelize');
const { User, SeekerProfile, EmployerProfile, UserStatistics } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  // 不允许通过此路由更新密码
  if (req.body.password) {
    return next(new AppError('请使用专门的密码更新接口', 400));
  }

  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    return next(new AppError('未找到该用户', 404));
  }
  
  // 过滤不允许更新的字段
  const filteredBody = filterObj(req.body, 'username', 'email', 'phone', 'avatar', 'role', 'status');
  
  // 更新用户
  await user.update(filteredBody);
  
  res.status(200).json({
    status: 'success',
    data: {
      user
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

// 获取当前用户信息
exports.getMe = catchAsync(async (req, res, next) => {
  // req.user 是通过 authMiddleware.protect 中间件设置的
  const user = req.user;
  
  // 获取附加信息
  let profile = null;
  if (user.role === 'seeker') {
    profile = await SeekerProfile.findOne({ where: { user_id: user.id } });
  } else if (user.role === 'employer') {
    profile = await EmployerProfile.findOne({ where: { user_id: user.id } });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user,
      profile
    }
  });
});

// 更新当前用户信息
exports.updateMe = catchAsync(async (req, res, next) => {
  // 不允许通过此路由更新密码
  if (req.body.password) {
    return next(new AppError('此路由不用于密码更新，请使用 /update-password', 400));
  }
  
  // 过滤不允许更新的字段
  const filteredBody = filterObj(req.body, 'username', 'email', 'phone', 'avatar');
  
  // 更新用户
  const updatedUser = await User.update(filteredBody, {
    where: { id: req.user.id },
    returning: true
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser[1][0]
    }
  });
});

// 更新密码
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // 验证当前密码
  const user = await User.findByPk(req.user.id, {
    attributes: { include: ['password'] }
  });
  
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return next(new AppError('当前密码不正确', 401));
  }
  
  // 更新密码
  user.password = newPassword; // 会在模型中自动加密
  user.password_changed_at = new Date();
  await user.save();
  
  // 返回新的JWT
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  res.status(200).json({
    status: 'success',
    token,
    message: '密码已成功更新'
  });
});

// 获取所有用户（管理员功能）
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] }
  });
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// 获取单个用户（管理员功能）
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] }
  });
  
  if (!user) {
    return next(new AppError('未找到该用户', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// 创建用户（管理员功能）
exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      user: newUser
    }
  });
});

// 更新用户（管理员功能）
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  
  if (!user) {
    return next(new AppError('未找到该用户', 404));
  }
  
  await user.destroy();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 工具函数 - 过滤对象属性
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
}; 