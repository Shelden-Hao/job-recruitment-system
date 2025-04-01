const { EmployerFeedback, SeekerFeedback, User, Job, EmployerProfile, SeekerProfile } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');

// 企业对求职者提交反馈
exports.createEmployerFeedback = catchAsync(async (req, res, next) => {
  const { seeker_id, job_id, rating, comment, is_public } = req.body;
  
  if (!seeker_id || !rating) {
    return next(new AppError('请提供求职者ID和评分', 400));
  }
  
  // 验证评分范围
  if (rating < 1 || rating > 5) {
    return next(new AppError('评分必须在1-5之间', 400));
  }
  
  // 检查用户权限
  if (req.user.role !== 'employer') {
    return next(new AppError('只有企业用户可以提交对求职者的反馈', 403));
  }
  
  // 检查是否已经对该求职者提交过反馈
  if (job_id) {
    const existingFeedback = await EmployerFeedback.findOne({
      where: {
        employer_id: req.user.id,
        seeker_id,
        job_id
      }
    });
    
    if (existingFeedback) {
      return next(new AppError('您已经对此求职者提交过针对此职位的反馈', 400));
    }
  }
  
  // 创建反馈
  const feedback = await EmployerFeedback.create({
    employer_id: req.user.id,
    seeker_id,
    job_id: job_id || null,
    rating,
    comment,
    is_public: is_public !== undefined ? is_public : true
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      feedback
    }
  });
});

// 求职者对企业提交反馈
exports.createSeekerFeedback = catchAsync(async (req, res, next) => {
  const { employer_id, job_id, company_rating, job_description_accurate, interview_experience_rating, comment, is_public } = req.body;
  
  if (!employer_id || !company_rating) {
    return next(new AppError('请提供企业ID和公司评分', 400));
  }
  
  // 验证评分范围
  if (company_rating < 1 || company_rating > 5) {
    return next(new AppError('评分必须在1-5之间', 400));
  }
  
  if (interview_experience_rating && (interview_experience_rating < 1 || interview_experience_rating > 5)) {
    return next(new AppError('面试体验评分必须在1-5之间', 400));
  }
  
  // 检查用户权限
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以提交对企业的反馈', 403));
  }
  
  // 检查是否已经对该企业提交过反馈
  if (job_id) {
    const existingFeedback = await SeekerFeedback.findOne({
      where: {
        seeker_id: req.user.id,
        employer_id,
        job_id
      }
    });
    
    if (existingFeedback) {
      return next(new AppError('您已经对此企业提交过针对此职位的反馈', 400));
    }
  }
  
  // 创建反馈
  const feedback = await SeekerFeedback.create({
    seeker_id: req.user.id,
    employer_id,
    job_id: job_id || null,
    company_rating,
    job_description_accurate: job_description_accurate !== undefined ? job_description_accurate : true,
    interview_experience_rating,
    comment,
    is_public: is_public !== undefined ? is_public : true
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      feedback
    }
  });
});

// 获取企业对求职者的反馈列表
exports.getEmployerFeedbacks = catchAsync(async (req, res, next) => {
  const { seeker_id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  // 构建查询条件
  const where = {
    seeker_id,
    is_public: true
  };
  
  // 如果是反馈所有者或管理员，则可以看到所有反馈（包括非公开的）
  if (req.user.id === parseInt(seeker_id) || req.user.role === 'admin') {
    delete where.is_public;
  }
  
  // 分页
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // 执行查询
  const feedbacks = await EmployerFeedback.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo']
          }
        ]
      },
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type']
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  // 计算总页数
  const totalPages = Math.ceil(feedbacks.count / parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: feedbacks.count,
    data: {
      feedbacks: feedbacks.rows,
      pagination: {
        total: feedbacks.count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: totalPages
      }
    }
  });
});

// 获取求职者对企业的反馈列表
exports.getSeekerFeedbacks = catchAsync(async (req, res, next) => {
  const { employer_id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  // 构建查询条件
  const where = {
    employer_id,
    is_public: true
  };
  
  // 如果是反馈所有者或管理员，则可以看到所有反馈（包括非公开的）
  if (req.user.id === parseInt(employer_id) || req.user.role === 'admin') {
    delete where.is_public;
  }
  
  // 分页
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // 执行查询
  const feedbacks = await SeekerFeedback.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name']
          }
        ]
      },
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type']
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  // 计算总页数
  const totalPages = Math.ceil(feedbacks.count / parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: feedbacks.count,
    data: {
      feedbacks: feedbacks.rows,
      pagination: {
        total: feedbacks.count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: totalPages
      }
    }
  });
});

// 获取职位的反馈列表
exports.getJobFeedbacks = catchAsync(async (req, res, next) => {
  const { job_id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  // 验证职位是否存在
  const job = await Job.findByPk(job_id);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 分页
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // 查询求职者对此职位的反馈
  const seekerFeedbacks = await SeekerFeedback.findAndCountAll({
    where: {
      job_id,
      is_public: true
    },
    include: [
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name']
          }
        ]
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  // 计算总页数
  const totalPages = Math.ceil(seekerFeedbacks.count / parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: seekerFeedbacks.count,
    data: {
      feedbacks: seekerFeedbacks.rows,
      pagination: {
        total: seekerFeedbacks.count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: totalPages
      }
    }
  });
});

// 更新反馈公开状态
exports.updateFeedbackVisibility = catchAsync(async (req, res, next) => {
  const { id, feedback_type } = req.params;
  const { is_public } = req.body;
  
  if (is_public === undefined) {
    return next(new AppError('请提供是否公开的状态', 400));
  }
  
  let feedback;
  
  // 根据反馈类型查找相应记录
  if (feedback_type === 'employer') {
    feedback = await EmployerFeedback.findByPk(id);
    
    if (!feedback) {
      return next(new AppError('未找到该反馈记录', 404));
    }
    
    // 检查权限
    if (feedback.employer_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限更新此反馈', 403));
    }
  } else if (feedback_type === 'seeker') {
    feedback = await SeekerFeedback.findByPk(id);
    
    if (!feedback) {
      return next(new AppError('未找到该反馈记录', 404));
    }
    
    // 检查权限
    if (feedback.seeker_id !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('您没有权限更新此反馈', 403));
    }
  } else {
    return next(new AppError('无效的反馈类型', 400));
  }
  
  // 更新公开状态
  await feedback.update({ is_public });
  
  res.status(200).json({
    status: 'success',
    data: {
      feedback
    }
  });
});

// 获取企业总体评分
exports.getEmployerRating = catchAsync(async (req, res, next) => {
  const { employer_id } = req.params;
  
  // 验证企业用户是否存在
  const employer = await User.findOne({
    where: {
      id: employer_id,
      role: 'employer'
    },
    include: [
      {
        model: EmployerProfile,
        as: 'employerProfile',
        attributes: ['company_name', 'company_logo']
      }
    ]
  });
  
  if (!employer) {
    return next(new AppError('未找到该企业用户', 404));
  }
  
  // 获取所有公开的反馈评分
  const feedbacks = await SeekerFeedback.findAll({
    where: {
      employer_id,
      is_public: true
    },
    attributes: ['company_rating', 'interview_experience_rating', 'job_description_accurate']
  });
  
  // 计算平均评分
  let totalCompanyRating = 0;
  let totalInterviewRating = 0;
  let accurateDescriptionCount = 0;
  
  const feedbackCount = feedbacks.length;
  let interviewRatingCount = 0;
  
  for (const feedback of feedbacks) {
    totalCompanyRating += feedback.company_rating;
    
    if (feedback.interview_experience_rating) {
      totalInterviewRating += feedback.interview_experience_rating;
      interviewRatingCount++;
    }
    
    if (feedback.job_description_accurate) {
      accurateDescriptionCount++;
    }
  }
  
  const avgCompanyRating = feedbackCount > 0 ? 
    parseFloat((totalCompanyRating / feedbackCount).toFixed(1)) : 0;
    
  const avgInterviewRating = interviewRatingCount > 0 ? 
    parseFloat((totalInterviewRating / interviewRatingCount).toFixed(1)) : 0;
    
  const accurateDescriptionPercentage = feedbackCount > 0 ? 
    parseFloat(((accurateDescriptionCount / feedbackCount) * 100).toFixed(1)) : 0;
  
  res.status(200).json({
    status: 'success',
    data: {
      employer: {
        id: employer.id,
        username: employer.username,
        company_name: employer.employerProfile?.company_name,
        company_logo: employer.employerProfile?.company_logo
      },
      ratings: {
        feedback_count: feedbackCount,
        average_company_rating: avgCompanyRating,
        average_interview_rating: avgInterviewRating,
        accurate_description_percentage: accurateDescriptionPercentage
      }
    }
  });
}); 