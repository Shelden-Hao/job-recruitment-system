const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, SeekerProfile, EmployerProfile, UserStatistics } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { promisify } = require('util');
const { Op } = require('sequelize');

// 生成JWT令牌
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// 创建并发送令牌
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  
  // 移除敏感信息
  const safeUser = user.toJSON();
  delete safeUser.password;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: safeUser
    }
  });
};

// 注册用户
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, phone, role } = req.body;
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('请提供有效的邮箱地址', 400));
  }
  
  // 检查邮箱是否已存在
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError('该邮箱已被注册', 400));
  }
  
  // 创建用户
  const user = await User.create({
    username,
    email,
    password, // 会在模型中自动加密
    phone,
    role: role || 'seeker', // 默认为求职者
    status: 'active'
  });
  
  // 根据角色创建相应的档案
  if (user.role === 'seeker') {
    await SeekerProfile.create({
      user_id: user.id,
      is_public: false
    });
  } else if (user.role === 'employer') {
    await EmployerProfile.create({
      user_id: user.id
    });
  }
  
  // 创建统计信息
  await UserStatistics.create({
    user_id: user.id
  });
  
  // 生成并发送令牌
  createSendToken(user, 201, res);
});

// 用户登录
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // 检查是否提供了邮箱和密码
  if (!email || !password) {
    return next(new AppError('请提供邮箱和密码', 400));
  }
  
  // 查找用户
  const user = await User.findOne({ 
    where: { email },
    attributes: { include: ['password'] } // 确保包含密码字段
  });
  
  // 检查用户是否存在且密码是否正确
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('邮箱或密码错误', 401));
  }
  
  // 检查账号是否激活
  if (user.status !== 'active') {
    return next(new AppError('您的账号已被禁用，请联系管理员', 401));
  }
  
  // 更新最后登录时间
  user.last_login = new Date();
  await user.save();
  
  // 生成并发送令牌
  createSendToken(user, 200, res);
});

// 获取当前用户信息
exports.getMe = catchAsync(async (req, res, next) => {
  // 获取当前已登录用户
  const user = req.user;
  
  // 根据用户角色获取相应的详细资料
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

// 更新密码
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // 1) 获取当前用户
  const user = await User.findByPk(req.user.id);
  
  // 2) 检查当前密码是否正确
  if (!(await user.validatePassword(currentPassword))) {
    return next(new AppError('当前密码不正确', 401));
  }
  
  // 3) 更新密码
  user.password = newPassword;
  await user.save();
  
  // 4) 重新登录用户，生成新的JWT
  createSendToken(user, 200, res);
});

// 忘记密码
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return next(new AppError('请提供邮箱地址', 400));
  }
  
  // 查找用户
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('此邮箱地址未注册', 404));
  }
  
  // 生成重置令牌
  const resetToken = Math.random().toString(36).substring(2, 15);
  const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期
  
  // 保存重置令牌到用户记录
  user.reset_token = resetToken;
  user.reset_token_expires = resetTokenExpires;
  await user.save();
  
  // TODO: 发送重置密码邮件
  
  res.status(200).json({
    status: 'success',
    message: '重置密码的链接已发送到您的邮箱'
  });
});

// 重置密码
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return next(new AppError('请提供重置令牌和新密码', 400));
  }
  
  // 查找具有有效重置令牌的用户
  const user = await User.findOne({
    where: {
      reset_token: token,
      reset_token_expires: { [Op.gt]: new Date() }
    }
  });
  
  if (!user) {
    return next(new AppError('令牌无效或已过期', 400));
  }
  
  // 更新密码
  user.password = password; // 会在模型中自动加密
  user.reset_token = null;
  user.reset_token_expires = null;
  await user.save();
  
  // 生成并发送新的JWT令牌
  createSendToken(user, 200, res);
});

// 中间件：保护路由（需要登录）
exports.protect = catchAsync(async (req, res, next) => {
  // 获取令牌
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return next(new AppError('您未登录，请先登录', 401));
  }
  
  // 验证令牌
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
  // 检查用户是否仍然存在
  const user = await User.findByPk(decoded.id);
  if (!user) {
    return next(new AppError('此令牌关联的用户不存在', 401));
  }
  
  // 如果用户修改了密码，检查令牌是否在密码修改之前签发
  if (user.password_changed_at && decoded.iat < user.password_changed_at.getTime() / 1000) {
    return next(new AppError('用户最近修改了密码，请重新登录', 401));
  }
  
  // 将用户信息添加到请求对象
  req.user = user;
  next();
});

// 限制角色访问
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('您没有权限执行此操作', 403));
    }
    next();
  };
}; 