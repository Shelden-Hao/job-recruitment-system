const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const htmlToText = require('html-to-text');

/**
 * 邮件配置
 */
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USERNAME || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  },
  from: process.env.EMAIL_FROM || 'Job Recruitment <noreply@jobplatform.com>'
};

/**
 * 创建邮件传输器
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

/**
 * 读取邮件模板
 * @param {String} templateName - 模板名称
 * @returns {String} 模板内容
 */
const loadEmailTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`读取邮件模板失败: ${templateName}`, error);
    // 返回一个简单的回退模板
    return '<html><body><h1>{{subject}}</h1><p>{{message}}</p></body></html>';
  }
};

/**
 * 编译模板并填充数据
 * @param {String} templateName - 模板名称
 * @param {Object} data - 模板数据
 * @returns {String} 编译后的HTML
 */
const compileTemplate = (templateName, data) => {
  const templateContent = loadEmailTemplate(templateName);
  const template = handlebars.compile(templateContent);
  return template(data);
};

/**
 * 发送邮件
 * @param {Object} options - 邮件选项
 * @param {String} options.to - 收件人邮箱
 * @param {String} options.subject - 邮件主题
 * @param {String} options.html - 邮件HTML内容
 * @param {String} options.text - 邮件纯文本内容
 * @param {Array} options.attachments - 附件数组
 * @returns {Promise<Object>} 发送结果
 */
exports.sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || htmlToText.fromString(options.html),
      attachments: options.attachments || []
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('邮件发送预览:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('邮件发送失败:', error);
    throw error;
  }
};

/**
 * 发送欢迎邮件
 * @param {Object} user - 用户对象
 * @param {String} user.email - 用户邮箱
 * @param {String} user.username - 用户名
 * @returns {Promise<Object>} 发送结果
 */
exports.sendWelcomeEmail = async (user) => {
  const html = compileTemplate('welcome', {
    username: user.username || user.name || '用户',
    year: new Date().getFullYear(),
    loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`
  });
  
  return this.sendEmail({
    to: user.email,
    subject: '欢迎加入求职招聘平台',
    html
  });
};

/**
 * 发送密码重置邮件
 * @param {Object} user - 用户对象
 * @param {String} user.email - 用户邮箱
 * @param {String} user.username - 用户名
 * @param {String} resetToken - 重置令牌
 * @param {Number} expireMinutes - 过期时间（分钟）
 * @returns {Promise<Object>} 发送结果
 */
exports.sendPasswordResetEmail = async (user, resetToken, expireMinutes = 10) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const html = compileTemplate('password-reset', {
    username: user.username || user.name || '用户',
    resetUrl,
    expireMinutes,
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: user.email,
    subject: '密码重置请求',
    html
  });
};

/**
 * 发送新应聘申请通知邮件
 * @param {Object} employer - 雇主对象
 * @param {Object} application - 应聘申请对象
 * @param {Object} job - 岗位对象
 * @param {Object} seeker - 求职者对象
 * @returns {Promise<Object>} 发送结果
 */
exports.sendNewApplicationEmail = async (employer, application, job, seeker) => {
  const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/applications/${application.id}`;
  
  const html = compileTemplate('new-application', {
    employerName: employer.username || employer.name || '雇主',
    jobTitle: job.title,
    seekerName: seeker.username || seeker.name || '求职者',
    applicationUrl,
    applicationDate: new Date(application.created_at).toLocaleDateString('zh-CN'),
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: employer.email,
    subject: `新的应聘申请: ${job.title}`,
    html
  });
};

/**
 * 发送应聘状态更新邮件
 * @param {Object} seeker - 求职者对象
 * @param {Object} application - 应聘申请对象
 * @param {Object} job - 岗位对象
 * @param {String} oldStatus - 旧状态
 * @param {String} newStatus - 新状态
 * @returns {Promise<Object>} 发送结果
 */
exports.sendApplicationStatusEmail = async (seeker, application, job, oldStatus, newStatus) => {
  const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-applications/${application.id}`;
  
  // 根据状态设置不同的主题和内容
  let subject = '应聘状态更新';
  let templateName = 'application-status-update';
  
  if (newStatus === 'interview') {
    subject = '恭喜您获得面试机会';
    templateName = 'interview-invitation';
  } else if (newStatus === 'hired') {
    subject = '恭喜您获得录用通知';
    templateName = 'job-offer';
  } else if (newStatus === 'rejected') {
    subject = '应聘结果通知';
    templateName = 'application-rejected';
  }
  
  const html = compileTemplate(templateName, {
    seekerName: seeker.username || seeker.name || '求职者',
    jobTitle: job.title,
    companyName: job.company_name,
    applicationUrl,
    oldStatus,
    newStatus,
    updateDate: new Date().toLocaleDateString('zh-CN'),
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: seeker.email,
    subject,
    html
  });
};

/**
 * 发送面试邀请邮件
 * @param {Object} seeker - 求职者对象
 * @param {Object} interview - 面试对象
 * @param {Object} job - 岗位对象
 * @returns {Promise<Object>} 发送结果
 */
exports.sendInterviewInvitationEmail = async (seeker, interview, job) => {
  const interviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/interviews/${interview.id}`;
  const interviewDate = new Date(interview.scheduled_at).toLocaleString('zh-CN');
  
  const html = compileTemplate('interview-invitation', {
    seekerName: seeker.username || seeker.name || '求职者',
    jobTitle: job.title,
    companyName: job.company_name,
    interviewDate,
    interviewLocation: interview.location || '线上面试',
    interviewType: interview.type || '常规面试',
    interviewNotes: interview.notes || '无特别说明',
    interviewUrl,
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: seeker.email,
    subject: `面试邀请: ${job.title} - ${job.company_name}`,
    html
  });
};

/**
 * 发送简历已查看邮件
 * @param {Object} seeker - 求职者对象
 * @param {Object} application - 应聘申请对象
 * @param {Object} job - 岗位对象
 * @returns {Promise<Object>} 发送结果
 */
exports.sendResumeViewedEmail = async (seeker, application, job) => {
  const applicationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-applications/${application.id}`;
  
  const html = compileTemplate('resume-viewed', {
    seekerName: seeker.username || seeker.name || '求职者',
    jobTitle: job.title,
    companyName: job.company_name,
    applicationUrl,
    viewDate: new Date().toLocaleDateString('zh-CN'),
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: seeker.email,
    subject: `您的简历已被查看: ${job.title} - ${job.company_name}`,
    html
  });
};

/**
 * 发送职位推荐邮件
 * @param {Object} user - 用户对象
 * @param {Array} jobs - 推荐的职位数组
 * @returns {Promise<Object>} 发送结果
 */
exports.sendJobRecommendationsEmail = async (user, jobs) => {
  const recommendationsUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recommendations`;
  
  const html = compileTemplate('job-recommendations', {
    username: user.username || user.name || '用户',
    jobs: jobs.map(job => ({
      title: job.title,
      company: job.company_name,
      location: job.location,
      salary: job.salary_range || '薪资面议',
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${job.id}`,
      matchScore: job.match_score || '推荐'
    })),
    recommendationsUrl,
    year: new Date().getFullYear()
  });
  
  return this.sendEmail({
    to: user.email,
    subject: '为您推荐的职位',
    html
  });
}; 