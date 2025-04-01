const { JobApplication, Job, User, SeekerProfile, EmployerProfile, UserStatistics, JobStatistics } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { calculateMatchingScore } = require('../utils/matchingUtil');

// 申请职位
exports.applyForJob = catchAsync(async (req, res, next) => {
  const { job_id, cover_letter } = req.body;
  const seeker_id = req.user.id;
  
  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以申请职位', 403));
  }
  
  // 检查职位是否存在
  const job = await Job.findByPk(job_id);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查职位状态是否为活跃
  if (job.status !== 'active') {
    return next(new AppError('该职位已不再接受申请', 400));
  }
  
  // 检查是否已经申请过该职位
  const existingApplication = await JobApplication.findOne({
    where: {
      job_id,
      seeker_id
    }
  });
  
  if (existingApplication) {
    return next(new AppError('您已经申请过该职位', 400));
  }
  
  // 获取求职者简历URL
  const seekerProfile = await SeekerProfile.findOne({
    where: { user_id: seeker_id }
  });
  
  if (!seekerProfile || !seekerProfile.resume_url) {
    return next(new AppError('请先上传您的简历', 400));
  }
  
  // 计算匹配度分数
  const matchingScore = await calculateMatchingScore(job, seekerProfile);
  
  // 创建职位申请
  const newApplication = await JobApplication.create({
    job_id,
    seeker_id,
    resume_url: seekerProfile.resume_url,
    cover_letter,
    application_date: new Date(),
    status: 'applied',
    matching_score: matchingScore
  });
  
  // 更新统计信息
  // 1. 更新职位申请数量
  await Job.increment('applications_count', { where: { id: job_id } });
  
  // 2. 更新职位统计
  await JobStatistics.increment('applications', { where: { job_id } });
  
  // 3. 更新用户统计
  await UserStatistics.increment('job_applications', {
    where: { user_id: seeker_id }
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      application: {
        ...newApplication.toJSON(),
        matching_score: matchingScore
      }
    }
  });
});

// 获取申请列表（针对求职者或企业）
exports.getApplications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { status, job_id, page = 1, limit = 10 } = req.query;
  
  // 构建查询条件
  const where = {};
  
  // 根据用户角色构建不同的查询条件
  if (req.user.role === 'seeker') {
    where.seeker_id = userId;
  } else if (req.user.role === 'employer') {
    // 如果提供了job_id，确认该职位属于当前企业用户
    if (job_id) {
      const job = await Job.findByPk(job_id);
      if (!job || job.employer_id !== userId) {
        return next(new AppError('您没有权限查看此职位的申请', 403));
      }
      where.job_id = job_id;
    } else {
      // 获取该企业用户发布的所有职位
      const jobs = await Job.findAll({
        where: { employer_id: userId },
        attributes: ['id']
      });
      
      if (jobs.length === 0) {
        return res.status(200).json({
          status: 'success',
          results: 0,
          data: {
            applications: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              total_pages: 0
            }
          }
        });
      }
      
      where.job_id = jobs.map(job => job.id);
    }
  }
  
  // 筛选申请状态
  if (status) {
    where.status = status;
  }
  
  // 分页
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // 执行查询
  const applications = await JobApplication.findAndCountAll({
    where,
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type', 'salary_min', 'salary_max']
      },
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name', 'education_level', 'school', 'major', 'work_experience_years']
          }
        ]
      }
    ],
    limit: parseInt(limit),
    offset,
    order: [['application_date', 'DESC']]
  });
  
  // 计算总页数
  const totalPages = Math.ceil(applications.count / parseInt(limit));
  
  // 如果是企业用户查看申请，更新已查看状态
  if (req.user.role === 'employer' && applications.rows.length > 0) {
    const applicationIds = applications.rows
      .filter(app => !app.viewed_by_employer)
      .map(app => app.id);
    
    if (applicationIds.length > 0) {
      await JobApplication.update(
        {
          viewed_by_employer: true,
          viewed_at: new Date()
        },
        {
          where: { id: applicationIds }
        }
      );
    }
  }
  
  res.status(200).json({
    status: 'success',
    results: applications.count,
    data: {
      applications: applications.rows,
      pagination: {
        total: applications.count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: totalPages
      }
    }
  });
});

// 获取单个申请详情
exports.getApplication = catchAsync(async (req, res, next) => {
  const applicationId = req.params.id;
  
  // 查找申请
  const application = await JobApplication.findByPk(applicationId, {
    include: [
      {
        model: Job,
        include: [
          {
            model: User,
            as: 'employer',
            attributes: ['id', 'username'],
            include: [
              {
                model: EmployerProfile,
                as: 'employerProfile',
                attributes: ['company_name', 'company_logo', 'industry']
              }
            ]
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
            as: 'seekerProfile'
          }
        ]
      }
    ]
  });
  
  if (!application) {
    return next(new AppError('未找到该申请', 404));
  }
  
  // 验证权限：只有申请者、职位发布者和管理员可以查看
  const isSeeker = req.user.id === application.seeker_id;
  const isEmployer = req.user.id === application.Job.employer_id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isSeeker && !isEmployer && !isAdmin) {
    return next(new AppError('您没有权限查看此申请', 403));
  }
  
  // 如果是企业用户查看，更新已查看状态
  if (isEmployer && !application.viewed_by_employer) {
    application.viewed_by_employer = true;
    application.viewed_at = new Date();
    await application.save();
  }
  
  // 脱敏处理：如果是企业查看求职者，对敏感信息脱敏
  const applicationData = application.toJSON();
  if (isEmployer && applicationData.seeker) {
    if (applicationData.seeker.email) {
      applicationData.seeker.email = maskEmail(applicationData.seeker.email);
    }
    
    if (applicationData.seeker.seekerProfile && applicationData.seeker.seekerProfile.phone) {
      applicationData.seeker.seekerProfile.phone = maskPhone(applicationData.seeker.seekerProfile.phone);
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      application: applicationData
    }
  });
});

// 更新申请状态
exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, employer_notes } = req.body;
  
  // 查找申请
  const application = await JobApplication.findByPk(id, {
    include: [
      {
        model: Job
      }
    ]
  });
  
  if (!application) {
    return next(new AppError('未找到该申请', 404));
  }
  
  // 验证权限：只有职位发布者和管理员可以更新申请状态
  const isEmployer = req.user.id === application.Job.employer_id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isEmployer && !isAdmin) {
    return next(new AppError('您没有权限更新此申请', 403));
  }
  
  // 验证状态值
  const validStatuses = ['applied', 'reviewing', 'interview', 'offer', 'rejected', 'withdrawn'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('无效的申请状态', 400));
  }
  
  // 更新申请
  const updateData = { status };
  if (employer_notes) {
    updateData.employer_notes = employer_notes;
  }
  
  await application.update(updateData);
  
  // 如果状态更新为offer，增加offer计数
  if (status === 'offer') {
    // 更新求职者的获得offer数量
    await UserStatistics.increment('offers_received', {
      where: { user_id: application.seeker_id }
    });
    
    // 更新企业的发送offer数量
    await UserStatistics.increment('offers_sent', {
      where: { user_id: application.Job.employer_id }
    });
    
    // 更新职位的offer数量
    await JobStatistics.increment('offers_made', {
      where: { job_id: application.job_id }
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 撤回申请
exports.withdrawApplication = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // 查找申请
  const application = await JobApplication.findByPk(id);
  
  if (!application) {
    return next(new AppError('未找到该申请', 404));
  }
  
  // 验证权限：只有申请者本人可以撤回申请
  if (req.user.id !== application.seeker_id) {
    return next(new AppError('您没有权限撤回此申请', 403));
  }
  
  // 检查申请状态：只有在applied或reviewing状态的申请可以撤回
  if (!['applied', 'reviewing'].includes(application.status)) {
    return next(new AppError('此状态的申请无法撤回', 400));
  }
  
  // 更新申请状态为withdrawn（已撤回）
  await application.update({ status: 'withdrawn' });
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 工具函数 - 邮箱脱敏
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}***@${domain}`;
};

// 工具函数 - 手机号脱敏
const maskPhone = (phone) => {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}; 