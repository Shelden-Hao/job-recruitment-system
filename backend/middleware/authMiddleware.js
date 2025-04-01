const authController = require('../controllers/authController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// 保护路由 - 需要认证
exports.protect = authController.protect;

// 限制角色访问
exports.restrictTo = authController.restrictTo;

// 检查是否为资源拥有者 - 适用于检查用户是否为特定资源的拥有者
exports.isResourceOwner = (model, paramIdField = 'id', ownerField = 'user_id') => {
  return catchAsync(async (req, res, next) => {
    const resourceId = req.params[paramIdField];
    
    // 管理员可以访问任何资源
    if (req.user.role === 'admin') {
      return next();
    }
    
    const resource = await model.findByPk(resourceId);
    if (!resource) {
      return next(new AppError('未找到该资源', 404));
    }
    
    // 检查当前用户是否为资源拥有者
    if (resource[ownerField] !== req.user.id) {
      return next(new AppError('您没有权限访问此资源', 403));
    }
    
    // 将资源附加到请求对象
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