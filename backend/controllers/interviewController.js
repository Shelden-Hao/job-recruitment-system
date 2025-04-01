const { Interview, Job, JobApplication, User, SeekerProfile, EmployerProfile, UserStatistics } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { Op } = require('sequelize');

// 创建面试
exports.createInterview = catchAsync(async (req, res, next) => {
  const {
    application_id,
    scheduled_time,
    duration_minutes,
    interview_type,
    location,
    online_meeting_link,
    description
  } = req.body;
  
  // 验证必填字段
  if (!application_id || !scheduled_time || !interview_type) {
    return next(new AppError('请提供申请ID、面试时间和面试类型', 400));
  }
  
  // 检查用户是否为企业用户
  if (req.user.role !== 'employer') {
    return next(new AppError('只有企业用户可以安排面试', 403));
  }
  
  // 检查申请是否存在
  const application = await JobApplication.findByPk(application_id, {
    include: [
      { 
        model: Job,
        attributes: ['id', 'employer_id', 'title']
      }
    ]
  });
  
  if (!application) {
    return next(new AppError('未找到该申请', 404));
  }
  
  // 检查是否为该职位的发布者
  if (application.Job.employer_id !== req.user.id) {
    return next(new AppError('您没有权限为此申请安排面试', 403));
  }
  
  // 检查申请状态是否适合安排面试
  if (!['applied', 'reviewing'].includes(application.status)) {
    return next(new AppError('此申请当前状态无法安排面试', 400));
  }
  
  // 创建面试记录
  const interview = await Interview.create({
    job_id: application.job_id,
    application_id,
    employer_id: req.user.id,
    seeker_id: application.seeker_id,
    scheduled_time: new Date(scheduled_time),
    duration_minutes: duration_minutes || 60,
    interview_type,
    location,
    online_meeting_link,
    description,
    status: 'scheduled',
    seeker_confirmed: false
  });
  
  // 更新申请状态为面试中
  await application.update({ status: 'interview' });
  
  // 更新统计信息
  await incrementInterviewStats(application.job_id, req.user.id);
  
  // TODO: 发送面试通知（可通过WebSocket、邮件或短信）
  
  res.status(201).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// 获取面试列表
exports.getInterviews = catchAsync(async (req, res, next) => {
  const {
    status,
    from_date,
    to_date,
    page = 1,
    limit = 10
  } = req.query;
  
  // 构建查询条件
  const where = {};
  
  // 根据用户角色设置筛选条件
  if (req.user.role === 'employer') {
    where.employer_id = req.user.id;
  } else if (req.user.role === 'seeker') {
    where.seeker_id = req.user.id;
  }
  
  // 按状态筛选
  if (status) {
    where.status = status;
  }
  
  // 按日期范围筛选
  if (from_date && to_date) {
    where.scheduled_time = {
      [Op.between]: [new Date(from_date), new Date(to_date)]
    };
  } else if (from_date) {
    where.scheduled_time = {
      [Op.gte]: new Date(from_date)
    };
  } else if (to_date) {
    where.scheduled_time = {
      [Op.lte]: new Date(to_date)
    };
  }
  
  // 分页
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // 执行查询
  const interviews = await Interview.findAndCountAll({
    where,
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type']
      },
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
    order: [['scheduled_time', 'ASC']]
  });
  
  // 计算总页数
  const totalPages = Math.ceil(interviews.count / parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: interviews.count,
    data: {
      interviews: interviews.rows,
      pagination: {
        total: interviews.count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: totalPages
      }
    }
  });
});

// 获取单个面试详情
exports.getInterview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // 查找面试
  const interview = await Interview.findByPk(id, {
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'description', 'location', 'job_type']
      },
      {
        model: JobApplication,
        attributes: ['id', 'status', 'resume_url', 'matching_score']
      },
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar', 'email'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'company_description', 'contact_person', 'contact_position']
          }
        ]
      },
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar', 'email'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name', 'education_level', 'school', 'major', 'work_experience_years']
          }
        ]
      }
    ]
  });
  
  if (!interview) {
    return next(new AppError('未找到该面试记录', 404));
  }
  
  // 检查权限
  const isEmployer = interview.employer_id === req.user.id;
  const isSeeker = interview.seeker_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isEmployer && !isSeeker && !isAdmin) {
    return next(new AppError('您没有权限查看此面试记录', 403));
  }
  
  // 对敏感信息进行处理（脱敏）
  const interviewData = interview.toJSON();
  
  // 如果是求职者查看，隐藏企业部分敏感信息
  if (isSeeker && !isAdmin) {
    if (interviewData.employer?.email) {
      interviewData.employer.email = maskEmail(interviewData.employer.email);
    }
  }
  
  // 如果是企业查看，隐藏求职者部分敏感信息
  if (isEmployer && !isAdmin) {
    if (interviewData.seeker?.email) {
      interviewData.seeker.email = maskEmail(interviewData.seeker.email);
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      interview: interviewData
    }
  });
});

// 更新面试状态
exports.updateInterviewStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  
  // 验证状态值
  const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('无效的面试状态', 400));
  }
  
  // 查找面试
  const interview = await Interview.findByPk(id);
  
  if (!interview) {
    return next(new AppError('未找到该面试记录', 404));
  }
  
  // 检查权限
  const isEmployer = interview.employer_id === req.user.id;
  const isSeeker = interview.seeker_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isEmployer && !isSeeker && !isAdmin) {
    return next(new AppError('您没有权限更新此面试状态', 403));
  }
  
  // 特定状态的权限验证
  if (status === 'cancelled' && !isEmployer && !isAdmin) {
    return next(new AppError('只有企业用户可以取消面试', 403));
  }
  
  if (status === 'completed' && !isEmployer && !isAdmin) {
    return next(new AppError('只有企业用户可以标记面试已完成', 403));
  }
  
  // 更新面试状态
  const updateData = { status };
  if (notes) {
    updateData.notes = notes;
  }
  
  // 如果是求职者确认面试
  if (isSeeker && status === 'confirmed') {
    updateData.seeker_confirmed = true;
  }
  
  await interview.update(updateData);
  
  // 如果面试被取消或完成，更新相关统计信息
  if (status === 'completed') {
    // 更新求职者的面试参加数量
    await UserStatistics.increment('interviews_attended', {
      where: { user_id: interview.seeker_id }
    });
    
    // 更新企业的面试主持数量
    await UserStatistics.increment('interviews_conducted', {
      where: { user_id: interview.employer_id }
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// 重新安排面试时间
exports.rescheduleInterview = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { scheduled_time, reason } = req.body;
  
  if (!scheduled_time) {
    return next(new AppError('请提供新的面试时间', 400));
  }
  
  // 查找面试
  const interview = await Interview.findByPk(id);
  
  if (!interview) {
    return next(new AppError('未找到该面试记录', 404));
  }
  
  // 检查权限
  const isEmployer = interview.employer_id === req.user.id;
  const isSeeker = interview.seeker_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isEmployer && !isSeeker && !isAdmin) {
    return next(new AppError('您没有权限重新安排此面试', 403));
  }
  
  // 更新面试
  await interview.update({
    scheduled_time: new Date(scheduled_time),
    status: 'rescheduled',
    seeker_confirmed: false,
    notes: reason ? `${interview.notes || ''}\n重新安排原因: ${reason}` : interview.notes
  });
  
  // TODO: 发送面试重新安排通知
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// 添加面试反馈
exports.addInterviewFeedback = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { feedback, rating } = req.body;
  
  // 查找面试
  const interview = await Interview.findByPk(id);
  
  if (!interview) {
    return next(new AppError('未找到该面试记录', 404));
  }
  
  // 检查面试是否已完成
  if (interview.status !== 'completed') {
    return next(new AppError('只能为已完成的面试添加反馈', 400));
  }
  
  // 检查权限
  const isEmployer = interview.employer_id === req.user.id;
  const isSeeker = interview.seeker_id === req.user.id;
  
  if (!isEmployer && !isSeeker) {
    return next(new AppError('您没有权限为此面试添加反馈', 403));
  }
  
  // 更新反馈字段
  const updateData = {};
  
  if (isEmployer) {
    updateData.employer_feedback = feedback;
    if (rating && rating >= 1 && rating <= 5) {
      updateData.employer_rating = rating;
    }
  } else if (isSeeker) {
    updateData.seeker_feedback = feedback;
  }
  
  await interview.update(updateData);
  
  res.status(200).json({
    status: 'success',
    data: {
      interview
    }
  });
});

// 获取未来待面试列表
exports.getUpcomingInterviews = catchAsync(async (req, res, next) => {
  // 构建查询条件
  const where = {
    scheduled_time: {
      [Op.gte]: new Date()
    },
    status: {
      [Op.in]: ['scheduled', 'confirmed', 'rescheduled']
    }
  };
  
  // 根据用户角色设置筛选条件
  if (req.user.role === 'employer') {
    where.employer_id = req.user.id;
  } else if (req.user.role === 'seeker') {
    where.seeker_id = req.user.id;
  }
  
  // 执行查询
  const interviews = await Interview.findAll({
    where,
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'location']
      },
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo']
          }
        ]
      },
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name']
          }
        ]
      }
    ],
    order: [['scheduled_time', 'ASC']],
    limit: 10
  });
  
  res.status(200).json({
    status: 'success',
    results: interviews.length,
    data: {
      interviews
    }
  });
});

// 工具函数 - 增加面试相关统计
const incrementInterviewStats = async (jobId, employerId) => {
  try {
    // 更新职位的面试安排数量
    await JobStatistics.increment('interviews_scheduled', {
      where: { job_id: jobId }
    });
    
    // 确保用户统计记录存在
    const [stats] = await UserStatistics.findOrCreate({
      where: { user_id: employerId },
      defaults: { user_id: employerId }
    });
    
    // 更新企业的面试主持数量
    await UserStatistics.increment('interviews_conducted', {
      where: { user_id: employerId }
    });
  } catch (error) {
    console.error('更新面试统计信息失败:', error);
  }
};

// 工具函数 - 邮箱脱敏
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
}; 