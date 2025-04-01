const jwt = require('jsonwebtoken');
const { ChatRoom, ChatMessage, User, EmployerProfile, SeekerProfile } = require('../models');
const { Op } = require('sequelize');

module.exports = (io) => {
  // 在线用户映射表
  const onlineUsers = new Map();

  // 认证中间件
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('未提供认证令牌'));
      }

      // 验证JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 获取用户信息
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return next(new Error('无效的用户'));
      }
      
      if (user.status !== 'active') {
        return next(new Error('账户未激活或已被禁用'));
      }
      
      // 将用户信息存储到socket对象中
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error('认证失败: ' + error.message));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`用户 ${socket.user.id} - ${socket.user.username} 已连接`);
    
    // 记录用户在线状态
    onlineUsers.set(socket.user.id, socket.id);
    
    // 加入个人房间以接收私人消息
    socket.join(`user_${socket.user.id}`);
    
    // 通知好友该用户已上线
    io.emit('user_status', { 
      user_id: socket.user.id, 
      status: 'online' 
    });
    
    // 用户断开连接
    socket.on('disconnect', () => {
      console.log(`用户 ${socket.user.id} 已断开连接`);
      onlineUsers.delete(socket.user.id);
      io.emit('user_status', { 
        user_id: socket.user.id, 
        status: 'offline' 
      });
    });
    
    // 获取所有聊天会话
    socket.on('get_chat_rooms', async () => {
      try {
        const userId = socket.user.id;
        const userRole = socket.user.role;
        
        let chatRooms;
        
        if (userRole === 'seeker') {
          chatRooms = await ChatRoom.findAll({
            where: { seeker_id: userId },
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
            ],
            order: [['last_message_time', 'DESC']]
          });
        } else if (userRole === 'employer') {
          chatRooms = await ChatRoom.findAll({
            where: { employer_id: userId },
            include: [
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
            order: [['last_message_time', 'DESC']]
          });
        }
        
        // 给每个聊天室添加在线状态信息
        const chatRoomsWithStatus = chatRooms.map(room => {
          const roomData = room.toJSON();
          const otherUserId = userRole === 'seeker' ? room.employer_id : room.seeker_id;
          roomData.is_online = onlineUsers.has(otherUserId);
          return roomData;
        });
        
        socket.emit('chat_rooms', chatRoomsWithStatus);
      } catch (error) {
        socket.emit('error', { message: '获取聊天室失败', error: error.message });
      }
    });
    
    // 创建或获取聊天会话
    socket.on('create_chat_room', async (data) => {
      try {
        const { recipient_id, job_id } = data;
        
        if (!recipient_id) {
          return socket.emit('error', { message: '缺少接收者ID' });
        }
        
        const userId = socket.user.id;
        const userRole = socket.user.role;
        
        // 确定谁是企业，谁是求职者
        let employerId, seekerId;
        
        if (userRole === 'employer') {
          employerId = userId;
          seekerId = recipient_id;
        } else if (userRole === 'seeker') {
          employerId = recipient_id;
          seekerId = userId;
        } else {
          return socket.emit('error', { message: '无效的用户角色' });
        }
        
        // 查询是否已存在聊天会话
        let chatRoom = await ChatRoom.findOne({
          where: {
            employer_id: employerId,
            seeker_id: seekerId,
            ...(job_id ? { job_id } : {})
          }
        });
        
        // 如果不存在，创建新的聊天会话
        if (!chatRoom) {
          chatRoom = await ChatRoom.create({
            employer_id: employerId,
            seeker_id: seekerId,
            job_id: job_id || null
          });
        }
        
        // 获取聊天会话详情
        const detailedRoom = await ChatRoom.findByPk(chatRoom.id, {
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
          ]
        });
        
        // 加入聊天室
        socket.join(`room_${chatRoom.id}`);
        
        socket.emit('chat_room_created', detailedRoom);
      } catch (error) {
        socket.emit('error', { message: '创建聊天室失败', error: error.message });
      }
    });
    
    // 加入特定聊天室
    socket.on('join_chat_room', async (data) => {
      try {
        const { room_id } = data;
        
        if (!room_id) {
          return socket.emit('error', { message: '缺少聊天室ID' });
        }
        
        // 验证用户是否有权限加入该聊天室
        const chatRoom = await ChatRoom.findByPk(room_id);
        
        if (!chatRoom) {
          return socket.emit('error', { message: '聊天室不存在' });
        }
        
        const userId = socket.user.id;
        
        if (chatRoom.employer_id !== userId && chatRoom.seeker_id !== userId) {
          return socket.emit('error', { message: '无权加入此聊天室' });
        }
        
        // 加入聊天室
        socket.join(`room_${room_id}`);
        
        // 重置未读消息计数
        if (socket.user.role === 'employer') {
          await ChatRoom.update(
            { employer_unread_count: 0 },
            { where: { id: room_id } }
          );
        } else if (socket.user.role === 'seeker') {
          await ChatRoom.update(
            { seeker_unread_count: 0 },
            { where: { id: room_id } }
          );
        }
        
        // 获取历史消息
        const messages = await ChatMessage.findAll({
          where: { room_id },
          order: [['createdAt', 'ASC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'avatar', 'role']
            }
          ]
        });
        
        socket.emit('chat_history', { room_id, messages });
      } catch (error) {
        socket.emit('error', { message: '加入聊天室失败', error: error.message });
      }
    });
    
    // 发送消息
    socket.on('send_message', async (data) => {
      try {
        const { room_id, content, message_type = 'text', file_url = null } = data;
        
        if (!room_id || !content) {
          return socket.emit('error', { message: '缺少必要参数' });
        }
        
        // 验证用户是否有权限发送消息
        const chatRoom = await ChatRoom.findByPk(room_id);
        
        if (!chatRoom) {
          return socket.emit('error', { message: '聊天室不存在' });
        }
        
        const userId = socket.user.id;
        
        if (chatRoom.employer_id !== userId && chatRoom.seeker_id !== userId) {
          return socket.emit('error', { message: '无权在此聊天室发送消息' });
        }
        
        // 创建消息
        const newMessage = await ChatMessage.create({
          room_id,
          sender_id: userId,
          message_type,
          content,
          file_url,
          is_read: false
        });
        
        // 获取发送者信息
        const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username', 'avatar', 'role']
            }
          ]
        });
        
        // 更新聊天室最后消息信息
        await chatRoom.update({
          last_message: content,
          last_message_time: new Date()
        });
        
        // 更新未读消息计数
        // 如果发送者是企业，增加求职者的未读计数
        if (socket.user.role === 'employer') {
          await chatRoom.increment('seeker_unread_count');
        } 
        // 如果发送者是求职者，增加企业的未读计数
        else if (socket.user.role === 'seeker') {
          await chatRoom.increment('employer_unread_count');
        }
        
        // 发送消息给聊天室所有成员
        io.to(`room_${room_id}`).emit('new_message', messageWithSender);
        
        // 如果接收者在线，发送通知
        const recipientId = socket.user.role === 'employer' ? chatRoom.seeker_id : chatRoom.employer_id;
        const recipientSocketId = onlineUsers.get(recipientId);
        
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message_notification', {
            room_id,
            message: messageWithSender,
            sender: {
              id: socket.user.id,
              username: socket.user.username,
              role: socket.user.role
            }
          });
        }
      } catch (error) {
        socket.emit('error', { message: '发送消息失败', error: error.message });
      }
    });
    
    // 标记消息为已读
    socket.on('mark_messages_read', async (data) => {
      try {
        const { room_id } = data;
        
        if (!room_id) {
          return socket.emit('error', { message: '缺少聊天室ID' });
        }
        
        // 验证用户是否有权限
        const chatRoom = await ChatRoom.findByPk(room_id);
        
        if (!chatRoom) {
          return socket.emit('error', { message: '聊天室不存在' });
        }
        
        const userId = socket.user.id;
        
        if (chatRoom.employer_id !== userId && chatRoom.seeker_id !== userId) {
          return socket.emit('error', { message: '无权访问此聊天室' });
        }
        
        // 获取需要标记为已读的消息
        const unreadMessages = await ChatMessage.findAll({
          where: {
            room_id,
            sender_id: { [Op.ne]: userId },
            is_read: false
          }
        });
        
        // 更新消息为已读
        if (unreadMessages.length > 0) {
          await ChatMessage.update(
            { 
              is_read: true,
              read_at: new Date()
            },
            {
              where: {
                id: unreadMessages.map(msg => msg.id)
              }
            }
          );
          
          // 重置未读消息计数
          if (socket.user.role === 'employer') {
            await chatRoom.update({ employer_unread_count: 0 });
          } else if (socket.user.role === 'seeker') {
            await chatRoom.update({ seeker_unread_count: 0 });
          }
          
          // 通知发送者消息已读
          const otherUserId = socket.user.role === 'employer' ? chatRoom.seeker_id : chatRoom.employer_id;
          const otherUserSocketId = onlineUsers.get(otherUserId);
          
          if (otherUserSocketId) {
            io.to(otherUserSocketId).emit('messages_read', {
              room_id,
              reader_id: userId,
              message_ids: unreadMessages.map(msg => msg.id)
            });
          }
        }
        
        socket.emit('mark_read_success', { room_id });
      } catch (error) {
        socket.emit('error', { message: '标记消息已读失败', error: error.message });
      }
    });
  });

  return io;
}; 