const User = require('./User');
const SeekerProfile = require('./SeekerProfile');
const EmployerProfile = require('./EmployerProfile');
const Job = require('./Job');
const Application = require('./Application');
const Interview = require('./Interview');
const Message = require('./Message');
const Notification = require('./Notification');
const JobView = require('./JobView');
const Feedback = require('./Feedback');
const Resume = require('./Resume');
const SavedJob = require('./SavedJob');

// 所有模型已经在各自的文件中定义了关联关系

module.exports = {
  User,
  SeekerProfile,
  EmployerProfile,
  Job,
  Application,
  Interview,
  Message,
  Notification,
  JobView,
  Feedback,
  Resume,
  SavedJob
}; 