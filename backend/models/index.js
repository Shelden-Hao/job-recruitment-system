const User = require('./User');
const SeekerProfile = require('./SeekerProfile');
const EmployerProfile = require('./EmployerProfile');
const Job = require('./Job');
const JobApplication = require('./JobApplication');
const Interview = require('./Interview');
const Message = require('./Message');
const Notification = require('./Notification');
const JobView = require('./JobView');
const Feedback = require('./Feedback');
const Resume = require('./Resume');
const SavedJob = require('./SavedJob');
const Chat = require('./Chat');
const ChatMessage = require('./chatMessageModel');
const UserStatistics = require('./UserStatistics');
const JobStatistics = require('./JobStatistics');

// 建立 Chat 与 User 之间的关联关系
Chat.belongsTo(User, { 
  foreignKey: 'employerId', 
  as: 'employer' 
});

Chat.belongsTo(User, { 
  foreignKey: 'seekerId', 
  as: 'seeker' 
});

User.hasMany(Chat, {
  foreignKey: 'employerId',
  as: 'employerChats'
});

User.hasMany(Chat, {
  foreignKey: 'seekerId',
  as: 'seekerChats'
});

// 建立 Chat 和 ChatMessage 之间的关联关系
ChatMessage.belongsTo(Chat, { 
  foreignKey: 'chatId', 
  as: 'chat' 
});

ChatMessage.belongsTo(User, { 
  foreignKey: 'senderId', 
  as: 'sender' 
});

Chat.hasMany(ChatMessage, {
  foreignKey: 'chatId',
  as: 'messages'
});

// 最后一条消息关联
Chat.belongsTo(ChatMessage, {
  foreignKey: 'lastMessageId',
  as: 'lastMessage',
  constraints: false // 避免循环依赖
});

// 建立 Interview 与相关模型的关联关系
Interview.belongsTo(User, { foreignKey: 'employer_id', as: 'employer' });
Interview.belongsTo(User, { foreignKey: 'seeker_id', as: 'seeker' });
Interview.belongsTo(Job, { foreignKey: 'job_id' });
Interview.belongsTo(JobApplication, { foreignKey: 'application_id' });

User.hasMany(Interview, { foreignKey: 'employer_id', as: 'employerInterviews' });
User.hasMany(Interview, { foreignKey: 'seeker_id', as: 'seekerInterviews' });
Job.hasMany(Interview, { foreignKey: 'job_id' });
JobApplication.hasMany(Interview, { foreignKey: 'application_id' });

// 所有模型已经在各自的文件中定义了关联关系

module.exports = {
  User,
  SeekerProfile,
  EmployerProfile,
  Job,
  JobApplication,
  Interview,
  Message,
  Notification,
  JobView,
  Feedback,
  Resume,
  SavedJob,
  Chat,
  ChatMessage,
  UserStatistics,
  JobStatistics
}; 