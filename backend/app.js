const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 数据库配置
const { sequelize, testDbConnection } = require('./config/database');

// 初始化Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(helmet()); // 安全头设置
app.use(cors()); // 跨域请求处理
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体
app.use(morgan('dev')); // 日志

// 限制请求速率
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs内最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api', limiter);

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);

// WebSocket处理
require('./services/socketService')(io);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 测试数据库连接
    await testDbConnection();
    
    // 同步数据库模型
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    
    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
  }
};

startServer();

module.exports = { app, server, io }; 