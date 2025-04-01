const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { catchAsync, AppError } = require('./errorMiddleware');

// 验证用户是否登录
exports.protect = catchAsync(async (req, res, next) => {
  // 1) 获取token并检查是否存在
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('您未登录，请先登录', 401));
  }

  // 2) 验证token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) 检查用户是否仍然存在
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next(new AppError('此token关联的用户不存在', 401));
  }

  // 4) 将用户信息附加到请求对象
  req.user = currentUser;
  next();
});

// 限制角色访问
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // 检查当前用户角色是否在允许的角色列表中
    if (!roles.includes(req.user.role)) {
      return next(new AppError('您没有权限执行此操作', 403));
    }
    next();
  };
};

// 检查是否为资源拥有者 - 适用于检查用户是否为特定资源的拥有者
exports.isResourceOwner = (modelName, paramName = 'id', ownerField = 'user_id') => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramName];
    const model = require(`../models`)[modelName];
    
    const resource = await model.findByPk(resourceId);
    if (!resource) {
      return next(new AppError('未找到资源', 404));
    }
    
    // 检查当前用户是否为资源拥有者，或者是管理员
    if (resource[ownerField] !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您不是此资源的拥有者', 403));
    }
    
    // 将资源添加到请求对象
    req.resource = resource;
    next();
  });
};

// 检查是否为职位发布者
exports.isJobOwner = catchAsync(async (req, res, next) => {
  const jobId = req.params.jobId || req.params.id;
  const { Job } = require('../models');
  
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('职位不存在', 404));
  }
  
  // 检查当前用户是否为职位发布者，或者是管理员
  if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您不是此职位的发布者', 403));
  }
  
  // 将职位添加到请求对象
  req.job = job;
  next();
});

// 检查是否为企业用户
exports.isEmployer = (req, res, next) => {
  if (req.user.role !== 'employer' && req.user.role !== 'admin') {
    return next(new AppError('此功能仅对企业用户开放', 403));
  }
  next();
};

// 检查是否为求职者用户
exports.isSeeker = (req, res, next) => {
  if (req.user.role !== 'seeker' && req.user.role !== 'admin') {
    return next(new AppError('此功能仅对求职者开放', 403));
  }
  next();
};

// 检查是否为管理员
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('此功能仅对管理员开放', 403));
  }
  next();
}; 