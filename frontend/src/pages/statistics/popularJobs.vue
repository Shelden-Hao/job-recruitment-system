<template>
  <view class="container">
    <u-navbar 
      title="热门职位" 
      :autoBack="true"
      bgColor="#ffffff"
    />
    
    <view class="content">
      <u-card
        :title="'热门职位排行'"
        :head-style="{ borderBottom: '1px solid #f5f5f5' }"
        :foot-style="{ borderTop: '1px solid #f5f5f5' }"
      >
        <template #body>
          <view class="chart-wrapper">
            <popular-jobs-chart :limit="10" height="450rpx" />
          </view>
        </template>
        <template #foot>
          <view class="chart-footer">
            <u-text 
              v-if="!statisticsStore.loading && hasData" 
              type="info" 
              text="数据来源：系统职位申请统计" 
              iconStyle="font-size: 28rpx" 
              size="24rpx"
            />
          </view>
        </template>
      </u-card>
      
      <view class="popular-list" v-if="hasData">
        <u-card :title="'Top 10 热门职位详情'" margin="20rpx 0">
          <template #body>
            <u-list>
              <u-list-item v-for="(job, index) in popularJobs" :key="index">
                <u-cell
                  :title="job.title"
                  :titleStyle="{ fontWeight: index < 3 ? 'bold' : 'normal' }"
                  :value="`${job.count}个职位`"
                  :label="job.company || '多家企业'"
                  :isLink="true"
                  @click="navigateToJobList(job.title)"
                >
                  <template #icon>
                    <u-avatar
                      :text="(index + 1).toString()"
                      :bgColor="getTopNColor(index)"
                      fontSize="24rpx"
                      size="50rpx"
                      customStyle="margin-right: 10rpx;"
                    ></u-avatar>
                  </template>
                </u-cell>
              </u-list-item>
            </u-list>
          </template>
        </u-card>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStatisticsStore } from '@/stores/statistics'
import PopularJobsChart from '@/components/statistics/PopularJobsChart.vue'

// 状态管理
const statisticsStore = useStatisticsStore()

// 计算属性
const hasData = computed(() => {
  return statisticsStore.popularJobs && statisticsStore.popularJobs.length > 0
})

const popularJobs = computed(() => {
  if (!hasData.value) return []
  return statisticsStore.popularJobs
})

// 生命周期
onMounted(async () => {
  await statisticsStore.fetchPopularJobs(10)
})

// 方法
function getTopNColor(index) {
  // 前三名使用特殊颜色
  const colors = ['#FF6B6B', '#FF9E4D', '#FFC154', '#4ECB73', '#1890FF']
  return index < colors.length ? colors[index] : '#909399'
}

function navigateToJobList(keyword) {
  uni.navigateTo({
    url: `/pages/jobs/list?keyword=${encodeURIComponent(keyword)}`
  })
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  background-color: $bg-color;
  min-height: 100vh;
}

.content {
  padding: $spacing-base;
}

.chart-wrapper {
  width: 100%;
  height: 450rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-small 0;
}

.popular-list {
  margin-top: $spacing-base;
}
</style> 