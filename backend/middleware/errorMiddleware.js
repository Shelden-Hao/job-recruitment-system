// 开发环境中的错误处理
const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// 生产环境中的错误处理（不暴露敏感信息）
const sendErrorProd = (err, req, res) => {
  // 操作错误：安全地发送给客户端
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    // 编程错误或未知错误：不泄露错误详情
    console.error('错误 💥', err);
    return res.status(500).json({
      status: 'error',
      message: '服务器内部错误'
    });
  }
};

// 处理Sequelize数据库错误
const handleSequelizeValidationError = (err) => {
  const errors = err.errors.map(error => error.message);
  const message = `无效输入数据: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors[0].path;
  const message = `${field}已存在，请使用其他值`;
  return new AppError(message, 400);
};

// 处理JWT错误
const handleJWTError = () => new AppError('令牌无效，请重新登录', 401);
const handleJWTExpiredError = () => new AppError('令牌已过期，请重新登录', 401);

// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // 处理特定类型的错误
    if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
    if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// 捕获未处理的异步操作错误
const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync
}; 