const { Application, Job, User, SeekerProfile, EmployerProfile, Resume } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { calculateMatchScore } = require('../utils/matchingUtils');
const { sendApplicationNotification } = require('../utils/notificationUtils');
const { Op } = require('sequelize');

// 创建职位申请
exports.createApplication = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  const { cover_letter, resume_id } = req.body;
  
  // 验证是否是求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以申请职位', 403));
  }
  
  // 检查职位是否存在
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('职位不存在', 404));
  }
  
  // 检查职位是否开放申请
  if (job.status !== 'open') {
    return next(new AppError('该职位当前不接受申请', 400));
  }
  
  // 检查是否已经申请过该职位
  const existingApplication = await Application.findOne({
    where: {
      job_id: jobId,
      seeker_id: req.user.id
    }
  });
  
  if (existingApplication) {
    return next(new AppError('您已经申请过该职位', 400));
  }
  
  // 获取简历信息
  let resumeUrl = null;
  if (resume_id) {
    const { Resume } = require('../models');
    const resume = await Resume.findOne({
      where: {
        id: resume_id,
        user_id: req.user.id
      }
    });
    
    if (resume) {
      resumeUrl = resume.file_url;
    }
  }
  
  // 计算匹配分数
  const matchScore = await calculateMatchScoreForApplication(job, req.user.id);
  
  // 创建申请
  const application = await Application.create({
    job_id: jobId,
    seeker_id: req.user.id,
    cover_letter,
    resume_url: resumeUrl,
    status: 'submitted',
    match_score: matchScore,
    viewed_by_employer: false,
    viewed_by_seeker: true
  });
  
  // 更新职位申请数
  await Job.increment('applications_count', { where: { id: jobId } });
  
  // 发送通知给企业
  await sendApplicationNotification(job.employer_id, req.user.id, job.id, application.id);
  
  res.status(201).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 获取申请详情
exports.getApplication = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const application = await Application.findByPk(id, {
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type', 'salary_min', 'salary_max']
      },
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar', 'email'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name', 'gender', 'current_location', 'education_level', 'work_experience_years']
          }
        ]
      }
    ]
  });
  
  if (!application) {
    return next(new AppError('申请不存在', 404));
  }
  
  // 检查权限 - 只有申请者、职位发布者或管理员可以查看
  const job = await Job.findByPk(application.job_id);
  
  if (
    req.user.id !== application.seeker_id && 
    req.user.id !== job.employer_id && 
    req.user.role !== 'admin'
  ) {
    return next(new AppError('您没有权限查看此申请', 403));
  }
  
  // 标记为已读
  if (req.user.id === job.employer_id && !application.viewed_by_employer) {
    application.viewed_by_employer = true;
    await application.save();
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 更新申请状态
exports.updateApplicationStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, employer_notes } = req.body;
  
  const application = await Application.findByPk(id);
  
  if (!application) {
    return next(new AppError('申请不存在', 404));
  }
  
  // 获取职位信息，检查权限
  const job = await Job.findByPk(application.job_id);
  
  if (req.user.id !== job.employer_id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限更新此申请', 403));
  }
  
  // 更新状态
  application.status = status;
  if (employer_notes) {
    application.employer_notes = employer_notes;
  }
  
  await application.save();
  
  // 发送通知给求职者
  await sendStatusUpdateNotification(application);
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 获取求职者的所有申请
exports.getSeekerApplications = catchAsync(async (req, res, next) => {
  const userId = req.params.userId || req.user.id;
  
  // 验证权限
  if (userId !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看其他用户的申请', 403));
  }
  
  const applications = await Application.findAll({
    where: {
      seeker_id: userId
    },
    include: [
      {
        model: Job,
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
          }
        ]
      }
    ],
    order: [['updatedAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: {
      applications
    }
  });
});

// 获取职位的所有申请
exports.getJobApplications = catchAsync(async (req, res, next) => {
  const { jobId } = req.params;
  
  // 检查职位是否存在
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('职位不存在', 404));
  }
  
  // 检查权限
  if (req.user.id !== job.employer_id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看此职位的申请', 403));
  }
  
  // 获取所有申请
  const applications = await Application.findAll({
    where: {
      job_id: jobId
    },
    include: [
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar', 'email'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name', 'current_location', 'education_level', 'school', 'major', 'work_experience_years']
          }
        ]
      }
    ],
    order: [
      ['match_score', 'DESC'],
      ['createdAt', 'DESC']
    ]
  });
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: {
      applications
    }
  });
});

// 获取企业收到的所有申请
exports.getEmployerApplications = catchAsync(async (req, res, next) => {
  const employerId = req.params.employerId || req.user.id;
  
  // 验证权限
  if (employerId !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看其他企业的申请', 403));
  }
  
  // 状态筛选
  const statusFilter = req.query.status 
    ? { status: req.query.status } 
    : {};
  
  // 获取该企业的所有职位
  const jobs = await Job.findAll({
    where: {
      employer_id: employerId
    },
    attributes: ['id']
  });
  
  const jobIds = jobs.map(job => job.id);
  
  // 获取这些职位的所有申请
  const applications = await Application.findAll({
    where: {
      job_id: { [Op.in]: jobIds },
      ...statusFilter
    },
    include: [
      {
        model: Job,
        attributes: ['id', 'title', 'location', 'job_type']
      },
      {
        model: User,
        as: 'seeker',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['full_name', 'current_location']
          }
        ]
      }
    ],
    order: [['updatedAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: {
      applications
    }
  });
});

// 撤回申请
exports.withdrawApplication = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const application = await Application.findByPk(id);
  
  if (!application) {
    return next(new AppError('申请不存在', 404));
  }
  
  // 只有申请者本人可以撤回申请
  if (application.seeker_id !== req.user.id) {
    return next(new AppError('您只能撤回自己的申请', 403));
  }
  
  // 检查是否可以撤回
  if (['offered', 'accepted', 'rejected'].includes(application.status)) {
    return next(new AppError(`申请状态为"${application.status}"，无法撤回`, 400));
  }
  
  // 更新状态为已撤回
  application.status = 'withdrawn';
  await application.save();
  
  // 通知企业
  const job = await Job.findByPk(application.job_id);
  await sendWithdrawNotification(job.employer_id, req.user.id, job.id);
  
  res.status(200).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 计算申请匹配分数
const calculateMatchScoreForApplication = async (job, userId) => {
  try {
    // 获取用户资料
    const userProfile = await SeekerProfile.findOne({
      where: { user_id: userId }
    });
    
    // 获取用户简历
    const resume = await Resume.findOne({
      where: { 
        user_id: userId, 
        is_default: true,
        status: 'active'
      }
    });
    
    if (!userProfile) {
      return null;
    }
    
    return calculateMatchScore(job, userProfile, resume);
  } catch (error) {
    console.error('计算匹配分数错误:', error);
    return null;
  }
};

// 发送状态更新通知
const sendStatusUpdateNotification = async (application) => {
  // 获取相关信息
  const job = await Job.findByPk(application.job_id);
  const employer = await User.findByPk(job.employer_id);
  
  // 发送通知
  const { Notification } = require('../models');
  await Notification.create({
    user_id: application.seeker_id,
    title: '申请状态更新',
    content: `您申请的职位"${job.title}"状态已更新为"${application.status}"`,
    type: 'application',
    related_id: application.id,
    metadata: {
      job_id: job.id,
      application_id: application.id,
      employer_id: employer.id,
      status: application.status
    }
  });
};

// 发送撤回申请通知
const sendWithdrawNotification = async (employerId, seekerId, jobId) => {
  const seeker = await User.findByPk(seekerId, {
    include: [{ model: SeekerProfile, as: 'seekerProfile' }]
  });
  
  const job = await Job.findByPk(jobId);
  
  // 发送通知
  const { Notification } = require('../models');
  await Notification.create({
    user_id: employerId,
    title: '申请已撤回',
    content: `${seeker.seekerProfile.full_name || seeker.username}已撤回对职位"${job.title}"的申请`,
    type: 'application',
    related_id: jobId,
    metadata: {
      job_id: jobId,
      seeker_id: seekerId
    }
  });
}; 