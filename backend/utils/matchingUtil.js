/**
 * 简历与职位匹配度计算工具
 * 根据职位要求和求职者简历信息计算匹配度分数
 */

// 计算职位和求职者之间的匹配度
exports.calculateMatchingScore = async (job, seekerProfile) => {
  let totalScore = 0;
  let maxPossibleScore = 0;
  
  // 1. 技能匹配 (30分)
  const skillsScore = calculateSkillsMatch(job.required_skills, seekerProfile.skills);
  totalScore += skillsScore;
  maxPossibleScore += 30;
  
  // 2. 教育水平匹配 (20分)
  const educationScore = calculateEducationMatch(
    job.education_requirement, 
    seekerProfile.education_level
  );
  totalScore += educationScore;
  maxPossibleScore += 20;
  
  // 3. 工作经验匹配 (20分)
  const experienceScore = calculateExperienceMatch(
    job.experience_level, 
    seekerProfile.work_experience_years
  );
  totalScore += experienceScore;
  maxPossibleScore += 20;
  
  // 4. 薪资期望匹配 (15分)
  const salaryScore = calculateSalaryMatch(
    job.salary_min,
    job.salary_max,
    job.salary_negotiable,
    seekerProfile.expected_salary_min,
    seekerProfile.expected_salary_max
  );
  totalScore += salaryScore;
  maxPossibleScore += 15;
  
  // 5. 工作地点和偏好匹配 (15分)
  const locationPreferenceScore = calculateLocationPreferenceMatch(
    job.location,
    job.job_type,
    seekerProfile.job_preferences
  );
  totalScore += locationPreferenceScore;
  maxPossibleScore += 15;
  
  // 计算最终百分比得分
  const finalScore = Math.round((totalScore / maxPossibleScore) * 100);
  
  return finalScore;
};

// 技能匹配度计算
function calculateSkillsMatch(requiredSkills, candidateSkills) {
  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    return 30; // 如果职位没有指定技能要求，默认为满分
  }
  
  if (!Array.isArray(candidateSkills) || candidateSkills.length === 0) {
    return 0; // 如果候选人没有技能，得分为0
  }
  
  // 将技能转为小写进行比较
  const normalizedRequiredSkills = requiredSkills.map(skill => 
    typeof skill === 'string' ? skill.toLowerCase() : String(skill).toLowerCase()
  );
  
  const normalizedCandidateSkills = candidateSkills.map(skill => 
    typeof skill === 'string' ? skill.toLowerCase() : String(skill).toLowerCase()
  );
  
  // 计算匹配的技能数量
  let matchCount = 0;
  for (const skill of normalizedRequiredSkills) {
    if (normalizedCandidateSkills.some(candidateSkill => 
      candidateSkill.includes(skill) || skill.includes(candidateSkill)
    )) {
      matchCount++;
    }
  }
  
  // 计算匹配比例
  const matchRatio = matchCount / normalizedRequiredSkills.length;
  
  // 返回得分 (最高30分)
  return Math.round(matchRatio * 30);
}

// 教育水平匹配度计算
function calculateEducationMatch(requiredEducation, candidateEducation) {
  if (!requiredEducation || requiredEducation === 'none') {
    return 20; // 如果没有教育要求，默认为满分
  }
  
  if (!candidateEducation) {
    return 0; // 如果没有提供教育背景，得分为0
  }
  
  // 教育等级值映射
  const educationValues = {
    'none': 0,
    'high_school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5
  };
  
  const requiredValue = educationValues[requiredEducation] || 0;
  const candidateValue = educationValues[candidateEducation] || 0;
  
  if (candidateValue >= requiredValue) {
    return 20; // 如果达到或超过要求，满分
  } else {
    // 根据差距计算部分得分
    return Math.max(0, 20 - (requiredValue - candidateValue) * 5);
  }
}

// 工作经验匹配度计算
function calculateExperienceMatch(requiredExperience, candidateExperienceYears) {
  if (!requiredExperience) {
    return 20; // 如果没有经验要求，默认为满分
  }
  
  if (candidateExperienceYears === undefined || candidateExperienceYears === null) {
    return 0; // 如果没有提供经验年限，得分为0
  }
  
  // 经验等级对应的年限范围
  const experienceRanges = {
    'entry': { min: 0, max: 1 },
    'junior': { min: 1, max: 3 },
    'mid-level': { min: 3, max: 5 },
    'senior': { min: 5, max: 10 },
    'executive': { min: 10, max: 100 }
  };
  
  const range = experienceRanges[requiredExperience] || { min: 0, max: 0 };
  
  if (candidateExperienceYears >= range.min) {
    if (requiredExperience === 'entry' || requiredExperience === 'junior') {
      // 对于初级职位，经验刚好或略多都给满分
      return 20;
    } else if (candidateExperienceYears <= range.max * 1.5) {
      // 如果在要求范围内或略高，满分
      return 20;
    } else {
      // 经验过多，可能不匹配
      return 15;
    }
  } else {
    // 经验不足，按比例计算分数
    const ratio = candidateExperienceYears / range.min;
    return Math.round(ratio * 20);
  }
}

// 薪资期望匹配度计算
function calculateSalaryMatch(
  jobMinSalary, 
  jobMaxSalary, 
  isSalaryNegotiable, 
  candidateMinSalary, 
  candidateMaxSalary
) {
  // 如果没有提供薪资信息，或工资面议
  if ((!jobMinSalary && !jobMaxSalary) || isSalaryNegotiable) {
    return 15; // 满分
  }
  
  // 如果候选人没有设置薪资期望
  if (!candidateMinSalary && !candidateMaxSalary) {
    return 15; // 假设满分，因为没有冲突
  }
  
  // 标准化薪资值
  const jobMin = jobMinSalary || 0;
  const jobMax = jobMaxSalary || Infinity;
  const candidateMin = candidateMinSalary || 0;
  const candidateMax = candidateMaxSalary || Infinity;
  
  // 完全不重叠情况
  if (candidateMin > jobMax || candidateMax < jobMin) {
    return 0;
  }
  
  // 部分重叠情况
  if (candidateMin < jobMin && candidateMax < jobMax) {
    const overlapRatio = (candidateMax - jobMin) / (jobMax - jobMin);
    return Math.round(overlapRatio * 15);
  }
  
  if (candidateMin > jobMin && candidateMax > jobMax) {
    const overlapRatio = (jobMax - candidateMin) / (jobMax - jobMin);
    return Math.round(overlapRatio * 15);
  }
  
  // 完全重叠或包含关系
  return 15;
}

// 工作地点和偏好匹配度计算
function calculateLocationPreferenceMatch(jobLocation, jobType, jobPreferences) {
  let score = 0;
  const maxScore = 15;
  
  // 如果没有提供求职者偏好
  if (!jobPreferences || typeof jobPreferences !== 'object') {
    return maxScore / 2; // 默认给一半分数
  }
  
  // 工作地点匹配 (10分)
  if (jobPreferences.preferred_locations && Array.isArray(jobPreferences.preferred_locations)) {
    for (const location of jobPreferences.preferred_locations) {
      if (jobLocation.includes(location) || location.includes(jobLocation)) {
        score += 10;
        break;
      }
    }
  } else {
    score += 5; // 如果没有提供地点偏好，给一半分数
  }
  
  // 工作类型匹配 (5分)
  if (jobPreferences.preferred_job_types && Array.isArray(jobPreferences.preferred_job_types)) {
    if (jobPreferences.preferred_job_types.includes(jobType)) {
      score += 5;
    }
  } else {
    score += 2.5; // 如果没有提供工作类型偏好，给一半分数
  }
  
  return score;
} 