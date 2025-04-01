const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

/**
 * 提取简历数据
 * @param {Number} resumeId - 简历ID
 * @param {String} filePath - 文件路径
 * @param {String} fileExtension - 文件扩展名
 * @returns {Promise<void>}
 */
exports.extractResumeData = async (resumeId, filePath, fileExtension) => {
  try {
    // 更新解析状态
    const { Resume } = require('../models');
    await Resume.update(
      { parse_status: 'processing' },
      { where: { id: resumeId } }
    );
    
    let resumeText = '';
    
    // 根据文件类型提取文本
    if (fileExtension === '.pdf') {
      resumeText = await extractPdfText(filePath);
    } else if (['.doc', '.docx'].includes(fileExtension)) {
      resumeText = await extractDocText(filePath);
    } else {
      throw new Error(`不支持的文件类型: ${fileExtension}`);
    }
    
    // 提取结构化数据
    const extractedData = {
      extracted_skills: extractSkills(resumeText),
      extracted_experience: extractExperience(resumeText),
      extracted_education: extractEducation(resumeText)
    };
    
    // 更新简历记录
    await Resume.update({
      ...extractedData,
      parsed_data: {
        raw_text: resumeText,
        ...extractedData
      },
      is_parsed: true,
      parse_status: 'success'
    }, {
      where: { id: resumeId }
    });
    
    return extractedData;
  } catch (error) {
    console.error('简历解析错误:', error);
    
    // 更新解析状态为失败
    const { Resume } = require('../models');
    await Resume.update(
      { parse_status: 'failed' },
      { where: { id: resumeId } }
    );
    
    throw error;
  }
};

/**
 * 提取PDF文件文本
 * @param {String} filePath - PDF文件路径
 * @returns {Promise<String>} 提取的文本
 */
async function extractPdfText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error('提取PDF文本失败:', error);
    return '';
  }
}

/**
 * 提取DOC/DOCX文件文本
 * @param {String} filePath - DOC/DOCX文件路径
 * @returns {Promise<String>} 提取的文本
 */
async function extractDocText(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    console.error('提取DOC/DOCX文本失败:', error);
    return '';
  }
}

/**
 * 提取技能
 * @param {String} text - 简历文本内容
 * @returns {Array} 技能列表
 */
function extractSkills(text) {
  if (!text) return [];
  
  // 技能关键词库（示例）
  const skillKeywords = [
    // 编程语言
    'java', 'javascript', 'js', 'typescript', 'ts', 'python', 'c++', 'c#', 'php', 'ruby', 'swift', 
    'kotlin', 'go', 'golang', 'rust', 'scala', 'perl', 'r', 'dart', 'objective-c', 'shell',
    // 前端技术
    'html', 'css', 'react', 'vue', 'angular', 'jquery', 'bootstrap', 'sass', 'less',
    'webpack', 'redux', 'vuex', 'next.js', 'nuxt.js', 'tailwind', 'ui/ux', 'figma',
    // 后端技术
    'node.js', 'express', 'django', 'flask', 'spring', 'spring boot', 'laravel', 'rails',
    'restful', 'graphql', 'nestjs', 'asp.net', '.net core',
    // 数据库
    'mysql', 'postgresql', 'mongodb', 'sql', 'redis', 'sqlite', 'oracle', 'firebase',
    'dynamodb', 'couchbase', 'cassandra', 'neo4j', 'elasticsearch',
    // 云服务/DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'cicd', 'terraform',
    'ansible', 'git', 'github', 'gitlab', 'bitbucket', 'jira',
    // 移动开发
    'android', 'ios', 'react native', 'flutter', 'ionic', 'xamarin', 'cordova',
    // 大数据/AI
    'hadoop', 'spark', 'kafka', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
    'pandas', 'numpy', 'matplotlib', 'opencv', 'nlp', 'machine learning', 'deep learning',
    // 其他技能
    'agile', 'scrum', 'kanban', 'tdd', 'bdd', 'microservices', 'soa', 'rest api',
    'oauth', 'jwt', 'authentication', 'authorization', 'security', 'linux', 'unix',
    'windows', 'seo', 'a/b testing', 'analytics', 'ui/ux design', 'responsive design',
    // 常见业务软件
    'word', 'excel', 'powerpoint', 'photoshop', 'illustrator', 'indesign', 'sketch',
    'sap', 'salesforce', 'tableau', 'power bi', 'quickbooks', 'marketo', 'hubspot'
  ];
  
  // 将文本转为小写以进行不区分大小写的匹配
  const lowerText = text.toLowerCase();
  
  // 找出所有匹配的技能
  const skills = skillKeywords.filter(skill => {
    // 确保技能单词不是更长单词的一部分
    const pattern = new RegExp(`\\b${skill}\\b`, 'i');
    return pattern.test(lowerText);
  });
  
  // 去重并返回
  return [...new Set(skills)];
}

/**
 * 提取工作经验
 * @param {String} text - 简历文本内容
 * @returns {Array} 工作经验列表
 */
function extractExperience(text) {
  if (!text) return [];
  
  // 这里只是一个简单示例，实际实现可能需要更复杂的NLP技术
  const experience = [];
  
  // 常见的工作经验部分标题
  const experienceSectionPatterns = [
    /工作经[历验]|professional experience|work experience/i,
    /employment|job history|career history/i,
    /工作[经验]|专业[经验]/i
  ];
  
  // 查找工作经验部分
  let experienceSection = '';
  for (const pattern of experienceSectionPatterns) {
    const matches = text.match(new RegExp(`(${pattern.source}).*?(?=教育背景|education|技能|skills|荣誉|honors|项目经验|projects|自我评价|self-assessment|个人简介|profile|$)`, 'is'));
    if (matches && matches[0]) {
      experienceSection = matches[0];
      break;
    }
  }
  
  // 如果找到工作经验部分，尝试提取公司和职位
  if (experienceSection) {
    // 匹配日期范围的模式
    const datePatterns = [
      /(\d{4}[年\.\-\/]\d{1,2}[月\.\-\/]?\s*[-–—至到~]+\s*\d{4}[年\.\-\/]\d{1,2}[月\.\-\/]?|现在|至今|present)/gi,
      /(\d{4}[年\.\-\/]?\s*[-–—至到~]+\s*\d{4}[年\.\-\/]?|现在|至今|present)/gi
    ];
    
    // 尝试通过日期匹配提取工作条目
    for (const datePattern of datePatterns) {
      const sections = experienceSection.split(datePattern);
      if (sections.length > 1) {
        for (let i = 1; i < sections.length; i += 2) {
          // 提取职位和公司名称（简单实现，实际需要更复杂的逻辑）
          const lines = sections[i].trim().split(/\n|\./).filter(line => line.trim());
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            
            // 根据常见写法推测职位和公司
            const position = firstLine.length < 30 ? firstLine : '未知职位';
            const company = lines.length > 1 ? lines[1].trim() : '未知公司';
            
            experience.push({
              position,
              company,
              period: sections[i-1].trim(),
              description: sections[i].trim()
            });
          }
        }
        
        // 如果成功提取，跳出循环
        if (experience.length > 0) break;
      }
    }
  }
  
  return experience;
}

/**
 * 提取教育背景
 * @param {String} text - 简历文本内容
 * @returns {Array} 教育背景列表
 */
function extractEducation(text) {
  if (!text) return [];
  
  // 这里只是一个简单示例，实际实现可能需要更复杂的NLP技术
  const education = [];
  
  // 常见的教育部分标题
  const educationSectionPatterns = [
    /教育背景|education|academic background/i,
    /学历|学习经历|educational background/i
  ];
  
  // 查找教育部分
  let educationSection = '';
  for (const pattern of educationSectionPatterns) {
    const matches = text.match(new RegExp(`(${pattern.source}).*?(?=工作经[历验]|experience|技能|skills|荣誉|honors|项目经验|projects|自我评价|self-assessment|个人简介|profile|$)`, 'is'));
    if (matches && matches[0]) {
      educationSection = matches[0];
      break;
    }
  }
  
  // 常见的学位类型
  const degreePatterns = [
    /本科|学士|bachelor|b\.?a\.?|b\.?s\.?/i,
    /硕士|研究生|master|m\.?a\.?|m\.?s\.?|mba/i,
    /博士|phd|doctor|ph\.?d\.?/i,
    /专科|大专|associate|college/i,
    /高中|中专|high school|secondary/i
  ];
  
  // 如果找到教育部分，尝试提取学校和学位
  if (educationSection) {
    // 匹配日期范围的模式
    const datePatterns = [
      /(\d{4}[年\.\-\/]\d{1,2}[月\.\-\/]?\s*[-–—至到~]+\s*\d{4}[年\.\-\/]\d{1,2}[月\.\-\/]?|现在|至今|present)/gi,
      /(\d{4}[年\.\-\/]?\s*[-–—至到~]+\s*\d{4}[年\.\-\/]?|现在|至今|present)/gi
    ];
    
    // 尝试通过日期匹配提取教育条目
    for (const datePattern of datePatterns) {
      const sections = educationSection.split(datePattern);
      if (sections.length > 1) {
        for (let i = 1; i < sections.length; i += 2) {
          // 提取学校和专业（简单实现，实际需要更复杂的逻辑）
          const lines = sections[i].trim().split(/\n|\./).filter(line => line.trim());
          if (lines.length > 0) {
            const firstLine = lines[0].trim();
            
            // 推测学校
            const school = firstLine.length < 30 ? firstLine : '未知学校';
            
            // 推测学位
            let degree = '未知学位';
            for (const pattern of degreePatterns) {
              if (pattern.test(sections[i])) {
                degree = pattern.source.split('|')[0];
                break;
              }
            }
            
            // 推测专业
            const major = lines.length > 1 ? lines[1].trim() : '未知专业';
            
            education.push({
              school,
              degree,
              major,
              period: sections[i-1].trim(),
              description: sections[i].trim()
            });
          }
        }
        
        // 如果成功提取，跳出循环
        if (education.length > 0) break;
      }
    }
  }
  
  return education;
} 