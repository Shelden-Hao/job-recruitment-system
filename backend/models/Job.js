const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const EmployerProfile = require('./EmployerProfile');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  job_type: {
    type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'internship', 'remote'),
    allowNull: false
  },
  salary_min: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  salary_max: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  salary_type: {
    type: DataTypes.ENUM('monthly', 'yearly', 'hourly', 'daily', 'negotiable'),
    defaultValue: 'monthly'
  },
  experience_required: {
    type: DataTypes.ENUM('entry', 'junior', 'mid-level', 'senior', 'executive'),
    allowNull: false
  },
  education_required: {
    type: DataTypes.ENUM('none', 'high_school', 'associate', 'bachelor', 'master', 'phd'),
    allowNull: false,
    defaultValue: 'none'
  },
  skills_required: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('skills_required');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('skills_required', JSON.stringify(value));
    }
  },
  responsibilities: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  benefits: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('benefits');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('benefits', JSON.stringify(value));
    }
  },
  application_deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  vacancies: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  status: {
    type: DataTypes.ENUM('open', 'closed', 'draft', 'paused'),
    defaultValue: 'open'
  },
  views_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  applications_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  feature_level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,  // 0 = 普通职位, 1 = 特色职位, 2 = 紧急职位, 3 = 置顶职位等
    validate: {
      min: 0,
      max: 5
    }
  },
  is_remote: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('tags');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value));
    }
  }
}, {
  indexes: [
    {
      name: 'idx_job_title',
      fields: ['title']
    },
    {
      name: 'idx_job_location',
      fields: ['location']
    },
    {
      name: 'idx_job_status',
      fields: ['status']
    },
    {
      name: 'idx_job_salary',
      fields: ['salary_min', 'salary_max']
    }
  ]
});

// 关联关系
User.hasMany(Job, { foreignKey: 'employer_id', as: 'jobs' });
Job.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });

// 添加方法获取包含企业信息的职位数据
Job.prototype.getWithEmployerInfo = async function() {
  const jobData = this.toJSON();
  const employer = await User.findByPk(this.employer_id, {
    include: [{ model: EmployerProfile, as: 'employerProfile' }]
  });
  
  if (employer && employer.employerProfile) {
    jobData.company_name = employer.employerProfile.company_name;
    jobData.company_logo = employer.employerProfile.company_logo;
    jobData.industry = employer.employerProfile.industry;
  }
  
  return jobData;
};

module.exports = Job; 