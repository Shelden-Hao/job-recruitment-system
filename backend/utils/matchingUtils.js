/**
 * 职位与求职者匹配分数计算工具
 */

/**
 * 计算职位与求职者的匹配度分数
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @param {Object} resume - 求职者简历
 * @returns {Number} 匹配分数（0-100）
 */
exports.calculateMatchScore = (job, seekerProfile, resume) => {
  let score = 0;
  let factors = 0;
  
  // 1. 技能匹配度（最重要，40分）
  const skillScore = calculateSkillMatch(job, seekerProfile, resume);
  if (skillScore !== null) {
    score += skillScore * 40;
    factors++;
  }
  
  // 2. 教育要求匹配度（15分）
  const educationScore = calculateEducationMatch(job, seekerProfile);
  if (educationScore !== null) {
    score += educationScore * 15;
    factors++;
  }
  
  // 3. 经验要求匹配度（20分）
  const experienceScore = calculateExperienceMatch(job, seekerProfile);
  if (experienceScore !== null) {
    score += experienceScore * 20;
    factors++;
  }
  
  // 4. 位置匹配度（10分）
  const locationScore = calculateLocationMatch(job, seekerProfile);
  if (locationScore !== null) {
    score += locationScore * 10;
    factors++;
  }
  
  // 5. 期望薪资匹配度（15分）
  const salaryScore = calculateSalaryMatch(job, seekerProfile);
  if (salaryScore !== null) {
    score += salaryScore * 15;
    factors++;
  }
  
  // 如果没有匹配项，返回默认分数
  if (factors === 0) return 50;
  
  // 最终分数（0-100）
  const finalScore = score / factors;
  
  // 限制在0-100范围内
  return Math.min(Math.max(Math.round(finalScore), 0), 100);
};

/**
 * 计算技能匹配度
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @param {Object} resume - 求职者简历
 * @returns {Number} 匹配分数（0-1）
 */
function calculateSkillMatch(job, seekerProfile, resume) {
  // 如果没有技能信息，无法计算
  if (!job.skills_required || !job.skills_required.length) return null;
  
  // 合并简历和用户资料中的技能
  const seekerSkills = [];
  
  // 从用户资料中获取技能
  if (seekerProfile.skills && seekerProfile.skills.length) {
    seekerSkills.push(...seekerProfile.skills);
  }
  
  // 从简历中获取提取的技能
  if (resume && resume.extracted_skills && resume.extracted_skills.length) {
    seekerSkills.push(...resume.extracted_skills);
  }
  
  // 如果求职者没有技能信息，无法计算
  if (!seekerSkills.length) return 0;
  
  // 去重处理
  const uniqueSeekerSkills = [...new Set(seekerSkills.map(s => s.toLowerCase()))];
  const jobSkills = job.skills_required.map(s => s.toLowerCase());
  
  // 计算匹配的技能数
  let matchedSkills = 0;
  
  // 精确匹配
  for (const skill of uniqueSeekerSkills) {
    if (jobSkills.includes(skill)) {
      matchedSkills += 1;
    } else {
      // 模糊匹配（包含关系）
      for (const jobSkill of jobSkills) {
        if (jobSkill.includes(skill) || skill.includes(jobSkill)) {
          matchedSkills += 0.7; // 模糊匹配分值略低
          break;
        }
      }
    }
  }
  
  // 匹配度评分
  const totalRequired = jobSkills.length;
  const matchRatio = Math.min(matchedSkills / totalRequired, 1);
  
  return matchRatio;
}

/**
 * 计算教育匹配度
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @returns {Number} 匹配分数（0-1）
 */
function calculateEducationMatch(job, seekerProfile) {
  // 如果职位没有教育要求，或者是"无要求"
  if (!job.education_required || job.education_required === 'none') return 1;
  
  // 如果求职者没有填写教育信息
  if (!seekerProfile.education_level) return null;
  
  // 教育等级评分
  const educationLevels = {
    'none': 0,
    'high_school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5
  };
  
  const requiredLevel = educationLevels[job.education_required] || 0;
  const seekerLevel = educationLevels[seekerProfile.education_level] || 0;
  
  // 如果求职者学历高于要求，满分
  if (seekerLevel >= requiredLevel) {
    return 1;
  }
  
  // 否则按差距计算分数
  const diff = requiredLevel - seekerLevel;
  return Math.max(0, 1 - (diff * 0.3));
}

/**
 * 计算工作经验匹配度
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @returns {Number} 匹配分数（0-1）
 */
function calculateExperienceMatch(job, seekerProfile) {
  // 如果没有经验要求或用户没有填写经验
  if (!job.experience_required || !seekerProfile.work_experience_years) return null;
  
  // 经验等级评分
  const experienceLevels = {
    'entry': 0,
    'junior': 1,
    'mid-level': 3,
    'senior': 5,
    'executive': 8
  };
  
  const requiredYears = experienceLevels[job.experience_required] || 0;
  const seekerYears = seekerProfile.work_experience_years || 0;
  
  // 如果求职者经验高于要求，满分
  if (seekerYears >= requiredYears) {
    return 1;
  }
  
  // 否则按差距计算分数
  const diff = requiredYears - seekerYears;
  return Math.max(0, 1 - (diff * 0.2));
}

/**
 * 计算位置匹配度
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @returns {Number} 匹配分数（0-1）
 */
function calculateLocationMatch(job, seekerProfile) {
  // 如果没有位置信息
  if (!job.location || !seekerProfile.current_location) return null;
  
  // 远程工作，满分
  if (job.is_remote) return 1;
  
  // 精确匹配
  const jobLocation = job.location.toLowerCase();
  const seekerLocation = seekerProfile.current_location.toLowerCase();
  
  // 完全匹配
  if (jobLocation === seekerLocation) {
    return 1;
  }
  
  // 部分匹配（城市包含或被包含）
  if (jobLocation.includes(seekerLocation) || seekerLocation.includes(jobLocation)) {
    return 0.8;
  }
  
  // 检查是否在同一省份/区域（通过简单检查前缀）
  const jobRegion = jobLocation.split(' ')[0];
  const seekerRegion = seekerLocation.split(' ')[0];
  
  if (jobRegion === seekerRegion) {
    return 0.6;
  }
  
  // 不匹配
  return 0.3;
}

/**
 * 计算薪资匹配度
 * @param {Object} job - 职位信息
 * @param {Object} seekerProfile - 求职者资料
 * @returns {Number} 匹配分数（0-1）
 */
function calculateSalaryMatch(job, seekerProfile) {
  // 如果没有薪资信息
  if (
    !job.salary_min || 
    !job.salary_max || 
    !seekerProfile.expected_salary_min || 
    !seekerProfile.expected_salary_max
  ) return null;
  
  // 可协商薪资，满分
  if (job.salary_type === 'negotiable') return 1;
  
  const jobMin = job.salary_min;
  const jobMax = job.salary_max;
  const seekerMin = seekerProfile.expected_salary_min;
  const seekerMax = seekerProfile.expected_salary_max || seekerMin * 1.5;
  
  // 计算重叠区间
  const overlapStart = Math.max(jobMin, seekerMin);
  const overlapEnd = Math.min(jobMax, seekerMax);
  
  // 如果没有重叠
  if (overlapStart > overlapEnd) {
    // 计算差距有多大
    const gap = Math.min(
      Math.abs(jobMin - seekerMax), 
      Math.abs(seekerMin - jobMax)
    );
    
    // 差距过大
    if (gap > jobMax * 0.3) return 0;
    
    // 较小差距
    return Math.max(0, 0.5 - (gap / jobMax) * 0.5);
  }
  
  // 有重叠区间
  const jobRange = jobMax - jobMin;
  const seekerRange = seekerMax - seekerMin;
  const overlapRange = overlapEnd - overlapStart;
  
  // 计算重叠占比
  const jobOverlapRatio = jobRange > 0 ? overlapRange / jobRange : 0;
  const seekerOverlapRatio = seekerRange > 0 ? overlapRange / seekerRange : 0;
  
  // 取平均值
  return (jobOverlapRatio + seekerOverlapRatio) / 2;
} 