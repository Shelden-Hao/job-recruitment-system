const { User, Job, JobApplication, Interview, SeekerProfile, EmployerProfile, UserStatistics, JobStatistics, SystemStatistics } = require('../models');
const { catchAsync, AppError } = require('../middleware/errorMiddleware');
const { Op, Sequelize } = require('sequelize');

// 获取系统总体统计数据
exports.getSystemStats = catchAsync(async (req, res, next) => {
  // 检查用户权限（只有管理员能查看系统统计数据）
  if (req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看系统统计数据', 403));
  }
  
  // 获取最新的系统统计数据
  let systemStats = await SystemStatistics.findOne({
    order: [['date', 'DESC']]
  });
  
  // 如果没有统计数据，则生成初始数据
  if (!systemStats) {
    systemStats = await generateSystemStats();
  }
  
  // 额外获取一些实时统计数据
  const usersCount = await User.count();
  const activeUsersCount = await User.count({
    where: {
      status: 'active'
    }
  });
  const jobsCount = await Job.count();
  const activeJobsCount = await Job.count({
    where: {
      status: 'active'
    }
  });
  const applicationsCount = await JobApplication.count();
  const interviewsCount = await Interview.count();
  
  res.status(200).json({
    status: 'success',
    data: {
      system_stats: {
        ...systemStats.toJSON(),
        real_time: {
          total_users: usersCount,
          active_users: activeUsersCount,
          total_jobs: jobsCount,
          active_jobs: activeJobsCount,
          total_applications: applicationsCount,
          total_interviews: interviewsCount
        }
      }
    }
  });
});

// 获取用户统计数据
exports.getUserStats = catchAsync(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  // 检查权限（只能查看自己的统计数据或管理员）
  if (userId !== req.user.id.toString() && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看此用户的统计数据', 403));
  }
  
  // 获取用户信息和统计数据
  const user = await User.findByPk(userId, {
    include: [
      {
        model: UserStatistics,
        as: 'statistics'
      }
    ]
  });
  
  if (!user) {
    return next(new AppError('未找到该用户', 404));
  }
  
  // 确保统计数据存在
  if (!user.statistics) {
    // 创建初始统计数据
    await UserStatistics.create({
      user_id: userId
    });
    
    // 重新获取带统计数据的用户
    const updatedUser = await User.findByPk(userId, {
      include: [
        {
          model: UserStatistics,
          as: 'statistics'
        }
      ]
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        user_stats: updatedUser.statistics
      }
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user_stats: user.statistics
    }
  });
});

// 获取职位统计数据
exports.getJobStats = catchAsync(async (req, res, next) => {
  const { job_id } = req.params;
  
  // 查找职位及其统计数据
  const job = await Job.findByPk(job_id, {
    include: [
      {
        model: JobStatistics,
        as: 'statistics'
      }
    ]
  });
  
  if (!job) {
    return next(new AppError('未找到该职位', 404));
  }
  
  // 检查权限（只有职位发布者和管理员能查看）
  if (job.employer_id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('您没有权限查看此职位的统计数据', 403));
  }
  
  // 确保统计数据存在
  if (!job.statistics) {
    // 创建初始统计数据
    await JobStatistics.create({
      job_id
    });
    
    // 重新获取带统计数据的职位
    const updatedJob = await Job.findByPk(job_id, {
      include: [
        {
          model: JobStatistics,
          as: 'statistics'
        }
      ]
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        job_stats: updatedJob.statistics
      }
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      job_stats: job.statistics
    }
  });
});

// 获取热门职位统计
exports.getPopularJobStats = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  // 查询申请量最多的活跃职位
  const popularJobs = await Job.findAll({
    where: {
      status: 'active'
    },
    attributes: [
      'id', 'title', 'location', 'job_type',
      [Sequelize.fn('COUNT', Sequelize.col('applications.id')), 'application_count']
    ],
    include: [
      {
        model: JobApplication,
        as: 'applications',
        attributes: []
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
      }
    ],
    group: [
      'Job.id', 'employer.id', 'employer.employerProfile.id'
    ],
    order: [
      [Sequelize.fn('COUNT', Sequelize.col('applications.id')), 'DESC']
    ],
    limit: parseInt(limit)
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      popular_jobs: popularJobs
    }
  });
});

// 获取薪资分布统计
exports.getSalaryDistribution = catchAsync(async (req, res, next) => {
  // 薪资区间
  const salaryRanges = [
    { min: 0, max: 5000, label: '0-5k' },
    { min: 5000, max: 10000, label: '5k-10k' },
    { min: 10000, max: 15000, label: '10k-15k' },
    { min: 15000, max: 20000, label: '15k-20k' },
    { min: 20000, max: 30000, label: '20k-30k' },
    { min: 30000, max: 50000, label: '30k-50k' },
    { min: 50000, max: null, label: '50k+' }
  ];
  
  // 查询活跃职位的薪资数据
  const jobs = await Job.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { salary_min: { [Op.not]: null } },
        { salary_max: { [Op.not]: null } }
      ]
    },
    attributes: ['id', 'salary_min', 'salary_max']
  });
  
  // 计算各薪资区间的职位数量
  const distribution = salaryRanges.map(range => {
    const count = jobs.filter(job => {
      const min = job.salary_min || 0;
      const max = job.salary_max || min;
      // 检查平均薪资是否在区间内
      const avg = (min + max) / 2;
      
      if (range.max === null) {
        return avg >= range.min;
      }
      
      return avg >= range.min && avg < range.max;
    }).length;
    
    return {
      range: range.label,
      count
    };
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      salary_distribution: distribution
    }
  });
});

// 获取求职者地域分布统计
exports.getSeekerLocationDistribution = catchAsync(async (req, res, next) => {
  // 检查用户权限
  if (req.user.role === 'seeker') {
    return next(new AppError('您没有权限查看此统计数据', 403));
  }
  
  // 查询求职者的地域分布
  const locationData = await SeekerProfile.findAll({
    attributes: [
      'current_location',
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      current_location: {
        [Op.not]: null
      },
      is_public: true
    },
    group: ['current_location'],
    order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
    limit: 10
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      location_distribution: locationData
    }
  });
});

// 获取企业招聘趋势统计（按时间）
exports.getRecruitmentTrends = catchAsync(async (req, res, next) => {
  const { period = 'month', months = 6 } = req.query;
  
  // 计算查询的起始日期
  const endDate = new Date();
  const startDate = new Date();
  
  if (period === 'month') {
    startDate.setMonth(startDate.getMonth() - parseInt(months));
  } else if (period === 'week') {
    startDate.setDate(startDate.getDate() - 7 * parseInt(months));
  } else {
    return next(new AppError('无效的时间周期参数', 400));
  }
  
  // 查询指定时间段内的职位发布数量
  const jobTrends = await Job.findAll({
    attributes: [
      [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d'), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d')],
    order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d'), 'ASC']]
  });
  
  // 查询指定时间段内的申请数量
  const applicationTrends = await JobApplication.findAll({
    attributes: [
      [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d'), 'date'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
    ],
    where: {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d')],
    order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), period === 'month' ? '%Y-%m' : '%Y-%m-%d'), 'ASC']]
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      period,
      job_trends: jobTrends,
      application_trends: applicationTrends
    }
  });
});

// 内部函数：生成系统统计数据
const generateSystemStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 总用户数和新增用户数
  const totalUsers = await User.count();
  const newUsers = await User.count({
    where: {
      createdAt: {
        [Op.gte]: yesterday
      }
    }
  });
  
  // 活跃用户数（过去7天有登录记录的用户）
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const activeUsers = await User.count({
    where: {
      last_login: {
        [Op.gte]: last7Days
      }
    }
  });
  
  // 总职位数和新增职位数
  const totalJobs = await Job.count();
  const newJobs = await Job.count({
    where: {
      createdAt: {
        [Op.gte]: yesterday
      }
    }
  });
  
  // 总申请数和新增申请数
  const totalApplications = await JobApplication.count();
  const newApplications = await JobApplication.count({
    where: {
      createdAt: {
        [Op.gte]: yesterday
      }
    }
  });
  
  // 总面试数和新增面试数
  const totalInterviews = await Interview.count();
  const newInterviews = await Interview.count({
    where: {
      createdAt: {
        [Op.gte]: yesterday
      }
    }
  });
  
  // 平均职位持续时间（天）
  const jobs = await Job.findAll({
    where: {
      status: 'filled',
      createdAt: {
        [Op.not]: null
      },
      updatedAt: {
        [Op.not]: null
      }
    },
    attributes: ['createdAt', 'updatedAt']
  });
  
  let totalDays = 0;
  if (jobs.length > 0) {
    for (const job of jobs) {
      const days = (job.updatedAt - job.createdAt) / (1000 * 60 * 60 * 24);
      totalDays += days;
    }
  }
  
  const averageJobDuration = jobs.length > 0 ? parseFloat((totalDays / jobs.length).toFixed(1)) : 0;
  
  // 创建或更新系统统计记录
  const [stats, created] = await SystemStatistics.findOrCreate({
    where: {
      date: today
    },
    defaults: {
      date: today,
      total_users: totalUsers,
      new_users: newUsers,
      active_users: activeUsers,
      total_jobs: totalJobs,
      new_jobs: newJobs,
      total_applications: totalApplications,
      new_applications: newApplications,
      total_interviews: totalInterviews,
      new_interviews: newInterviews,
      average_job_duration: averageJobDuration
    }
  });
  
  if (!created) {
    await stats.update({
      total_users: totalUsers,
      new_users: newUsers,
      active_users: activeUsers,
      total_jobs: totalJobs,
      new_jobs: newJobs,
      total_applications: totalApplications,
      new_applications: newApplications,
      total_interviews: totalInterviews,
      new_interviews: newInterviews,
      average_job_duration: averageJobDuration
    });
  }
  
  return stats;
}; 