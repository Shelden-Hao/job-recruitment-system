const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// 系统统计数据 - 仅管理员
router.get(
  '/system',
  protect,
  restrictTo('admin'),
  statisticsController.getSystemStats
);

// 用户统计数据 - 个人或管理员
router.get(
  '/user/:id?',
  protect,
  statisticsController.getUserStats
);

// 职位统计数据 - 发布者或管理员
router.get(
  '/job/:job_id',
  protect,
  statisticsController.getJobStats
);

// 热门职位统计 - 所有用户
router.get(
  '/popular-jobs',
  protect,
  statisticsController.getPopularJobStats
);

// 薪资分布统计 - 所有用户
router.get(
  '/salary-distribution',
  protect,
  statisticsController.getSalaryDistribution
);

// 求职者地域分布 - 雇主和管理员
router.get(
  '/seeker-location',
  protect,
  restrictTo('employer', 'admin'),
  statisticsController.getSeekerLocationDistribution
);

// 招聘趋势统计 - 所有用户
router.get(
  '/recruitment-trends',
  protect,
  statisticsController.getRecruitmentTrends
);

module.exports = router; 