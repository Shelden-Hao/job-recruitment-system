const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, SeekerProfile, EmployerProfile } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');

// 生成JWT令牌
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// 创建并发送令牌
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);
  
  // 在响应中发送令牌
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// 注册用户
exports.register = catchAsync(async (req, res, next) => {
  // 1) 从请求体获取数据
  const { username, email, password, role, phone } = req.body;
  
  // 2) 检查必要字段
  if (!username || !email || !password) {
    return next(new AppError('请提供用户名、邮箱和密码', 400));
  }
  
  // 3) 检查该邮箱或用户名是否已被使用
  const existingUser = await User.findOne({ 
    where: {
      [Op.or]: [{ email }, { username }]
    }
  });
  
  if (existingUser) {
    return next(new AppError('该用户名或邮箱已被注册', 400));
  }
  
  // 4) 创建新用户
  const newUser = await User.create({
    username,
    email,
    password, // 密码会在模型的beforeCreate钩子中自动哈希
    role: role || 'seeker', // 默认为求职者
    phone: phone || null,
    last_login: new Date()
  });
  
  // 5) 根据用户角色创建对应的资料
  if (newUser.role === 'seeker') {
    await SeekerProfile.create({
      user_id: newUser.id,
      full_name: username // 初始时使用用户名作为全名
    });
  } else if (newUser.role === 'employer') {
    await EmployerProfile.create({
      user_id: newUser.id,
      company_name: req.body.company_name || '未设置公司名称',
      industry: req.body.industry || '未设置行业'
    });
  }
  
  // 6) 生成JWT并发送响应
  createSendToken(newUser, 201, req, res);
});

// 用户登录
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // 1) 检查是否提供了邮箱和密码
  if (!email || !password) {
    return next(new AppError('请提供邮箱和密码', 400));
  }
  
  // 2) 检查用户是否存在
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('邮箱或密码不正确', 401));
  }
  
  // 3) 验证密码是否正确
  const isPasswordCorrect = await user.validatePassword(password);
  if (!isPasswordCorrect) {
    return next(new AppError('邮箱或密码不正确', 401));
  }
  
  // 4) 如果用户被封禁
  if (user.status === 'blocked') {
    return next(new AppError('您的账户已被封禁，请联系管理员', 403));
  }
  
  // 5) 更新最后登录时间
  user.last_login = new Date();
  await user.save();
  
  // 6) 生成JWT并发送响应
  createSendToken(user, 200, req, res);
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
  createSendToken(user, 200, req, res);
});

// 忘记密码 - 发送重置邮件
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 在实际应用中，这里需要实现发送重置密码邮件的逻辑
  // 本例简化处理
  res.status(200).json({
    status: 'success',
    message: '重置密码的说明已发送到您的邮箱'
  });
});

// 重置密码
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 在实际应用中，这里需要实现验证重置令牌和更新密码的逻辑
  // 本例简化处理
  res.status(200).json({
    status: 'success',
    message: '密码重置成功'
  });
}); 