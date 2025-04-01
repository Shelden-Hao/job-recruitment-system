const { Op } = require('sequelize');
const { Job, User, EmployerProfile, JobApplication, JobStatistics, Resume, SeekerProfile } = require('../models');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { calculateMatchScore } = require('../utils/matchingUtils');

// 搜索职位 - 功能与 getAllJobs 相同，是其别名
exports.searchJobs = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  
  // 构建查询条件
  const whereClause = {
    status: 'open' // 默认只返回开放的职位
  };
  
  // 关键词搜索 - 职位标题、公司名称、描述
  if (req.query.keyword) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${req.query.keyword}%` } },
      { description: { [Op.like]: `%${req.query.keyword}%` } }
    ];
  }
  
  // 位置筛选
  if (req.query.location) {
    whereClause.location = { [Op.like]: `%${req.query.location}%` };
  }
  
  // 职位类型筛选
  if (req.query.job_type) {
    whereClause.job_type = req.query.job_type;
  }
  
  // 薪资范围筛选
  if (req.query.salary_min) {
    whereClause.salary_min = { [Op.gte]: parseInt(req.query.salary_min, 10) };
  }
  
  if (req.query.salary_max) {
    whereClause.salary_max = { [Op.lte]: parseInt(req.query.salary_max, 10) };
  }
  
  // 经验要求筛选
  if (req.query.experience_required) {
    whereClause.experience_required = req.query.experience_required;
  }
  
  // 教育要求筛选
  if (req.query.education_required) {
    whereClause.education_required = req.query.education_required;
  }
  
  // 远程工作筛选
  if (req.query.is_remote === 'true') {
    whereClause.is_remote = true;
  }
  
  // 排序选项
  let order = [];
  if (req.query.sort_by === 'latest') {
    order.push(['createdAt', 'DESC']);
  } else if (req.query.sort_by === 'salary_high') {
    order.push(['salary_max', 'DESC']);
  } else if (req.query.sort_by === 'salary_low') {
    order.push(['salary_min', 'ASC']);
  } else if (req.query.sort_by === 'most_viewed') {
    order.push(['views_count', 'DESC']);
  } else {
    // 默认排序：先显示特色职位，然后按创建时间降序
    order.push(['is_featured', 'DESC'], ['createdAt', 'DESC']);
  }
  
  // 执行查询
  const jobs = await Job.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'industry']
          }
        ]
      }
    ],
    limit,
    offset,
    order
  });
  
  // 分页元数据
  const totalPages = Math.ceil(jobs.count / limit);
  
  res.status(200).json({
    status: 'success',
    results: jobs.count,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults: jobs.count
    },
    data: {
      jobs: jobs.rows
    }
  });
});

// 获取所有职位（支持分页、排序、过滤）
exports.getAllJobs = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  
  // 构建查询条件
  const whereClause = {
    status: 'open' // 默认只返回开放的职位
  };
  
  // 关键词搜索 - 职位标题、公司名称、描述
  if (req.query.keyword) {
    whereClause[Op.or] = [
      { title: { [Op.like]: `%${req.query.keyword}%` } },
      { description: { [Op.like]: `%${req.query.keyword}%` } }
    ];
  }
  
  // 位置筛选
  if (req.query.location) {
    whereClause.location = { [Op.like]: `%${req.query.location}%` };
  }
  
  // 职位类型筛选
  if (req.query.job_type) {
    whereClause.job_type = req.query.job_type;
  }
  
  // 薪资范围筛选
  if (req.query.salary_min) {
    whereClause.salary_min = { [Op.gte]: parseInt(req.query.salary_min, 10) };
  }
  
  if (req.query.salary_max) {
    whereClause.salary_max = { [Op.lte]: parseInt(req.query.salary_max, 10) };
  }
  
  // 经验要求筛选
  if (req.query.experience_required) {
    whereClause.experience_required = req.query.experience_required;
  }
  
  // 教育要求筛选
  if (req.query.education_required) {
    whereClause.education_required = req.query.education_required;
  }
  
  // 远程工作筛选
  if (req.query.is_remote === 'true') {
    whereClause.is_remote = true;
  }
  
  // 排序选项
  let order = [];
  if (req.query.sort_by === 'latest') {
    order.push(['createdAt', 'DESC']);
  } else if (req.query.sort_by === 'salary_high') {
    order.push(['salary_max', 'DESC']);
  } else if (req.query.sort_by === 'salary_low') {
    order.push(['salary_min', 'ASC']);
  } else if (req.query.sort_by === 'most_viewed') {
    order.push(['views_count', 'DESC']);
  } else {
    // 默认排序：先显示特色职位，然后按创建时间降序
    order.push(['is_featured', 'DESC'], ['createdAt', 'DESC']);
  }
  
  // 执行查询
  const jobs = await Job.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'industry']
          }
        ]
      }
    ],
    limit,
    offset,
    order
  });
  
  // 分页元数据
  const totalPages = Math.ceil(jobs.count / limit);
  
  res.status(200).json({
    status: 'success',
    results: jobs.count,
    pagination: {
      page,
      limit,
      totalPages,
      totalResults: jobs.count
    },
    data: {
      jobs: jobs.rows
    }
  });
});

// 获取单个职位详情
exports.getJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  
  const job = await Job.findByPk(jobId, {
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'industry', 'company_size', 'company_description']
          }
        ]
      }
    ]
  });
  
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 增加浏览量
  job.views_count += 1;
  await job.save();
  
  // 如果用户已登录，记录谁查看了这个职位
  if (req.user) {
    const { JobView } = require('../models');
    await JobView.create({
      job_id: job.id,
      user_id: req.user.id,
      user_agent: req.headers['user-agent'],
      ip_address: req.ip
    });
    
    // 如果是求职者，计算匹配分数
    if (req.user.role === 'seeker') {
      const matchScore = await calculateJobMatchForUser(job, req.user.id);
      job.dataValues.matchScore = matchScore;
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      job
    }
  });
});

// 创建新职位
exports.createJob = catchAsync(async (req, res, next) => {
  // 检查用户是否为企业用户
  if (req.user.role !== 'employer' && req.user.role !== 'admin') {
    return next(new AppError('只有企业用户可以发布职位', 403));
  }
  
  // 提取请求体中的数据
  const {
    title,
    description,
    location,
    job_type,
    salary_min,
    salary_max,
    salary_type,
    experience_required,
    education_required,
    skills_required,
    responsibilities,
    benefits,
    application_deadline,
    is_remote,
    tags
  } = req.body;
  
  // 创建新职位
  const newJob = await Job.create({
    employer_id: req.user.id,
    title,
    description,
    location,
    job_type,
    salary_min,
    salary_max,
    salary_type,
    experience_required,
    education_required,
    skills_required,
    responsibilities,
    benefits,
    application_deadline,
    is_remote,
    tags,
    status: req.body.status || 'open'
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      job: newJob
    }
  });
});

// 更新职位
exports.updateJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  
  // 查找职位
  const job = await Job.findByPk(jobId);
  
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查权限
  if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限更新此职位', 403));
  }
  
  // 更新职位
  await job.update(req.body);
  
  res.status(200).json({
    status: 'success',
    data: {
      job
    }
  });
});

// 删除职位
exports.deleteJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  
  // 查找职位
  const job = await Job.findByPk(jobId);
  
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查权限
  if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限删除此职位', 403));
  }
  
  // 删除职位
  await job.destroy();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 获取企业发布的所有职位
exports.getEmployerJobs = catchAsync(async (req, res, next) => {
  const employerId = req.params.employerId || req.user.id;
  
  // 如果不是查看自己的，只能查看公开的职位
  const whereClause = { employer_id: employerId };
  if (req.user.id !== employerId && req.user.role !== 'admin') {
    whereClause.status = 'open';
  }
  
  const jobs = await Job.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'industry']
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    results: jobs.length,
    data: {
      jobs
    }
  });
});

// 计算特定职位与用户的匹配分数
const calculateJobMatchForUser = async (job, userId) => {
  try {
    // 获取用户的简历和资料
    const userProfile = await SeekerProfile.findOne({
      where: { user_id: userId }
    });
    
    // 获取用户的最新简历
    const resume = await Resume.findOne({
      where: { 
        user_id: userId,
        status: 'active',
        is_default: true
      },
      order: [['updatedAt', 'DESC']]
    });
    
    if (!userProfile) {
      return null;
    }
    
    // 计算匹配分数
    return calculateMatchScore(job, userProfile, resume);
  } catch (error) {
    console.error('计算匹配分数错误:', error);
    return null;
  }
};

// 为用户推荐职位
exports.getRecommendedJobs = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'seeker') {
    return next(new AppError('此功能仅适用于求职者', 403));
  }
  
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  
  // 获取用户资料
  const userProfile = await SeekerProfile.findOne({
    where: { user_id: req.user.id }
  });
  
  if (!userProfile) {
    return next(new AppError('请先完善您的个人资料', 400));
  }
  
  // 构建基础查询条件
  const whereClause = {
    status: 'open'
  };
  
  // 根据用户期望薪资推荐
  if (userProfile.expected_salary_min) {
    whereClause.salary_max = { [Op.gte]: userProfile.expected_salary_min };
  }
  
  // 根据用户位置推荐
  if (userProfile.current_location) {
    whereClause.location = { [Op.like]: `%${userProfile.current_location}%` };
  }
  
  // 根据用户技能推荐
  let skillsCondition = {};
  if (userProfile.skills && userProfile.skills.length > 0) {
    // 这里是简化的实现，实际可能需要更复杂的文本匹配或向量匹配
    skillsCondition = { 
      [Op.or]: userProfile.skills.map(skill => ({
        [Op.or]: [
          { title: { [Op.like]: `%${skill}%` } },
          { description: { [Op.like]: `%${skill}%` } },
          { skills_required: { [Op.like]: `%${skill}%` } }
        ]
      }))
    };
  }
  
  // 获取职位列表
  const jobs = await Job.findAll({
    where: {
      ...whereClause,
      ...skillsCondition
    },
    include: [
      {
        model: User,
        as: 'employer',
        attributes: ['id', 'username', 'avatar'],
        include: [
          {
            model: EmployerProfile,
            as: 'employerProfile',
            attributes: ['company_name', 'company_logo', 'industry']
          }
        ]
      }
    ],
    limit,
    offset,
    order: [['is_featured', 'DESC'], ['createdAt', 'DESC']]
  });
  
  // 计算每个职位的匹配度
  const jobsWithMatch = await Promise.all(
    jobs.map(async (job) => {
      const matchScore = await calculateJobMatchForUser(job, req.user.id);
      const jobData = job.toJSON();
      jobData.matchScore = matchScore;
      return jobData;
    })
  );
  
  // 按匹配度排序
  jobsWithMatch.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  
  res.status(200).json({
    status: 'success',
    results: jobsWithMatch.length,
    data: {
      jobs: jobsWithMatch
    }
  });
});

// 申请职位
exports.applyForJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  const userId = req.user.id;
  
  // 检查用户是否为求职者
  if (req.user.role !== 'seeker') {
    return next(new AppError('只有求职者可以申请职位', 403));
  }
  
  // 查找职位
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查职位是否开放
  if (job.status !== 'open') {
    return next(new AppError('该职位不再接受申请', 400));
  }
  
  // 检查是否已经申请过
  const existingApplication = await JobApplication.findOne({
    where: {
      job_id: jobId,
      user_id: userId
    }
  });
  
  if (existingApplication) {
    return next(new AppError('您已经申请过这个职位', 400));
  }
  
  // 获取用户的简历ID
  const { resume_id } = req.body;
  if (!resume_id) {
    return next(new AppError('请提供简历', 400));
  }
  
  // 检查简历是否存在且属于该用户
  const resume = await Resume.findOne({
    where: {
      id: resume_id,
      user_id: userId
    }
  });
  
  if (!resume) {
    return next(new AppError('未找到该简历或该简历不属于您', 404));
  }
  
  // 创建申请记录
  const application = await JobApplication.create({
    job_id: jobId,
    user_id: userId,
    resume_id,
    status: 'pending',
    cover_letter: req.body.cover_letter || null
  });
  
  // 更新职位申请数量
  job.applications_count = (job.applications_count || 0) + 1;
  await job.save();
  
  // 创建职位统计记录
  await JobStatistics.create({
    job_id: jobId,
    action_type: 'application',
    user_id: userId
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      application
    }
  });
});

// 获取用户收藏的职位
exports.getSavedJobs = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { SavedJob } = require('../models');
  
  const savedJobs = await SavedJob.findAll({
    where: { user_id: userId },
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
                attributes: ['company_name', 'company_logo', 'industry']
              }
            ]
          }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    results: savedJobs.length,
    data: {
      savedJobs
    }
  });
});

// 收藏职位
exports.saveJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  const userId = req.user.id;
  const { SavedJob } = require('../models');
  
  // 检查职位是否存在
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查是否已经收藏
  const existingSaved = await SavedJob.findOne({
    where: {
      job_id: jobId,
      user_id: userId
    }
  });
  
  if (existingSaved) {
    return next(new AppError('您已经收藏过这个职位', 400));
  }
  
  // 创建收藏记录
  const savedJob = await SavedJob.create({
    job_id: jobId,
    user_id: userId
  });
  
  // 更新职位收藏数量
  job.saves_count = (job.saves_count || 0) + 1;
  await job.save();
  
  // 创建职位统计记录
  await JobStatistics.create({
    job_id: jobId,
    action_type: 'save',
    user_id: userId
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      savedJob
    }
  });
});

// 取消收藏职位
exports.unsaveJob = catchAsync(async (req, res, next) => {
  const jobId = req.params.id;
  const userId = req.user.id;
  const { SavedJob } = require('../models');
  
  // 检查职位是否存在
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查是否已经收藏
  const savedJob = await SavedJob.findOne({
    where: {
      job_id: jobId,
      user_id: userId
    }
  });
  
  if (!savedJob) {
    return next(new AppError('您没有收藏过这个职位', 400));
  }
  
  // 删除收藏记录
  await savedJob.destroy();
  
  // 更新职位收藏数量
  if (job.saves_count > 0) {
    job.saves_count -= 1;
    await job.save();
  }
  
  // 创建职位统计记录
  await JobStatistics.create({
    job_id: jobId,
    action_type: 'unsave',
    user_id: userId
  });
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

// 获取职位申请列表
exports.getJobApplications = catchAsync(async (req, res, next) => {
  const jobId = req.params.jobId;
  
  // 检查职位是否存在
  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查权限
  if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看此职位的申请', 403));
  }
  
  // 获取申请列表
  const applications = await JobApplication.findAll({
    where: { job_id: jobId },
    include: [
      {
        model: User,
        attributes: ['id', 'username', 'avatar', 'email'],
        include: [
          {
            model: SeekerProfile,
            as: 'seekerProfile',
            attributes: ['name', 'phone', 'current_title', 'experience_years']
          }
        ]
      },
      {
        model: Resume,
        attributes: ['id', 'title', 'file_url']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
  
  res.status(200).json({
    status: 'success',
    results: applications.length,
    data: {
      applications
    }
  });
}); 