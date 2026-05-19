<template>
  <!-- ==================== Sidebar 模板布局 ==================== -->
  <div
    v-if="templateId === 'sidebar'"
    class="resume-document resume--sidebar"
    :style="sidebarCSSVars"
  >
    <!-- 左侧边栏（基本信息） -->
    <aside class="sidebar__left" data-section="basic" @click="$emit('click-section', 'basic')">
      <!-- 头像区域 -->
      <div class="sidebar__photo-wrapper">
        <div class="sidebar__photo">
          <img
            v-if="resume.basicInfo.photo"
            :src="resume.basicInfo.photo"
            :alt="resume.basicInfo.name"
            class="sidebar__photo-img"
          />
          <div v-else class="sidebar__photo-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 姓名和职位 -->
      <div class="sidebar__identity">
        <h1 class="sidebar__name">{{ resume.basicInfo.name || '你的姓名' }}</h1>
        <p class="sidebar__title">{{ resume.basicInfo.title || '你的职位' }}</p>
      </div>

      <!-- 联系信息 -->
      <div class="sidebar__contact">
        <div class="sidebar__section-title">
          <span class="sidebar__section-line"></span>
          联系方式
        </div>
        <div v-if="resume.basicInfo.email" class="sidebar__contact-item">
          <span class="sidebar__contact-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.2"/>
              <path d="M1 3L7 7L13 3" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>
          <span>{{ resume.basicInfo.email }}</span>
        </div>
        <div v-if="resume.basicInfo.phone" class="sidebar__contact-item">
          <span class="sidebar__contact-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2C2.45 2 2 2.45 2 3V4C2 7.5 5.5 11 9 11H10C10.55 11 11 10.55 11 10V9L9 8V10C6 10 4 6 4 4H6L5 2" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>
          <span>{{ resume.basicInfo.phone }}</span>
        </div>
        <div v-if="resume.basicInfo.location" class="sidebar__contact-item">
          <span class="sidebar__contact-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/>
              <path d="M7 8V13" stroke="currentColor" stroke-width="1.2"/>
              <circle cx="7" cy="5" r="1" fill="currentColor"/>
            </svg>
          </span>
          <span>{{ resume.basicInfo.location }}</span>
        </div>
        <div v-if="resume.basicInfo.website" class="sidebar__contact-item">
          <span class="sidebar__contact-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
              <path d="M1 7H13M7 1C4 3.5 4 10.5 7 13M7 1C10 3.5 10 10.5 7 13" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>
          <span>{{ resume.basicInfo.website }}</span>
        </div>
      </div>

      <!-- 技能 -->
      <div v-if="isSectionVisible('skills')" class="sidebar__skills">
        <div class="sidebar__section-title">
          <span class="sidebar__section-line"></span>
          {{ getSectionTitle(resume, 'skills') }}
        </div>
        <div v-if="getSkillsContent" class="sidebar__skill-text">
          {{ getSkillsContent }}
        </div>
        <div v-else class="sidebar__empty-hint">请添加技能...</div>
      </div>
    </aside>

    <!-- 右侧主内容区 -->
    <main class="sidebar__right">
      <!-- 根据 sectionOrder 动态渲染内容模块 -->
      <template v-for="sectionId in sidebarContentSections" :key="sectionId">
        <!-- 个人简介 -->
        <section v-if="sectionId === 'summary'" class="sidebar__section" data-section="summary" @click="$emit('click-section', 'summary')">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, 'summary') }}
          </h2>
          <p v-if="resume.basicInfo.summary" class="main__section-text">{{ resume.basicInfo.summary }}</p>
          <p v-else class="main__section-placeholder">请填写个人简介...</p>
        </section>

        <!-- 工作经历 -->
        <section v-if="sectionId === 'work'" class="sidebar__section" data-section="work" @click="$emit('click-section', 'work')">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, 'work') }}
          </h2>
          <div v-if="resume.workExperience.filter(i => !i.hidden).length">
            <div v-for="item in resume.workExperience.filter(i => !i.hidden)" :key="item.id" class="main__entry">
              <div class="main__entry-header">
                <div class="main__entry-info">
                  <h3 class="main__entry-title">{{ item.position }}</h3>
                  <p class="main__entry-subtitle">{{ item.company }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="main__entry-desc">{{ item.description }}</p>
              <ul v-if="item.highlights?.length" class="main__entry-highlights">
                <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
              </ul>
            </div>
          </div>
          <div v-else class="main__entry-placeholder">
            <div class="placeholder-row">
              <span class="placeholder-title">职位名称</span>
              <span class="placeholder-subtitle">公司名称</span>
            </div>
            <p class="placeholder-desc">请填写工作描述...</p>
          </div>
        </section>

        <!-- 教育经历 -->
        <section v-if="sectionId === 'education'" class="sidebar__section" data-section="education" @click="$emit('click-section', 'education')">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, 'education') }}
          </h2>
          <div v-if="resume.education.filter(i => !i.hidden).length">
            <div v-for="item in resume.education.filter(i => !i.hidden)" :key="item.id" class="main__entry">
              <div class="main__entry-header">
                <div class="main__entry-info">
                  <h3 class="main__entry-title">{{ item.school }}</h3>
                  <p class="main__entry-subtitle">{{ item.degree }} · {{ item.major }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="main__entry-desc">{{ item.description }}</p>
            </div>
          </div>
          <div v-else class="main__entry-placeholder">
            <div class="placeholder-row">
              <span class="placeholder-title">学校名称</span>
              <span class="placeholder-subtitle">学位 · 专业</span>
            </div>
            <p class="placeholder-desc">请填写教育描述...</p>
          </div>
        </section>

        <!-- 项目经验 -->
        <section v-if="sectionId === 'projects'" class="sidebar__section" data-section="projects" @click="$emit('click-section', 'projects')">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, 'projects') }}
          </h2>
          <div v-if="resume.projects.filter(i => !i.hidden).length">
            <div v-for="item in resume.projects.filter(i => !i.hidden)" :key="item.id" class="main__entry">
              <div class="main__entry-header">
                <div class="main__entry-info">
                  <h3 class="main__entry-title">{{ item.name }}</h3>
                  <p class="main__entry-subtitle">{{ item.role }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="main__entry-desc">{{ item.description }}</p>
              <ul v-if="item.highlights?.length" class="main__entry-highlights">
                <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
              </ul>
              <div v-if="item.technologies.length" class="main__entry-tags">
                <span v-for="(tech, idx) in item.technologies" :key="idx" class="main__tech-tag">{{ tech }}</span>
              </div>
            </div>
          </div>
          <div v-else class="main__entry-placeholder">
            <div class="placeholder-row">
              <span class="placeholder-title">项目名称</span>
              <span class="placeholder-subtitle">担任角色</span>
            </div>
            <p class="placeholder-desc">请填写项目描述...</p>
          </div>
        </section>

        <!-- 自我评价 -->
        <section v-if="sectionId === 'evaluation'" class="sidebar__section" data-section="evaluation" @click="$emit('click-section', 'evaluation')">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, 'evaluation') }}
          </h2>
          <p v-if="resume.selfEvaluation" class="main__section-text">{{ resume.selfEvaluation }}</p>
          <p v-else class="main__section-placeholder">请填写自我评价...</p>
        </section>

        <!-- 自定义文本模块 -->
        <section v-if="sectionId.startsWith('customText_')" class="sidebar__section" :data-section="sectionId" @click="$emit('click-section', sectionId)">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, sectionId) }}
          </h2>
          <p v-if="getCustomTextContent(sectionId)" class="main__section-text">{{ getCustomTextContent(sectionId) }}</p>
          <p v-else class="main__section-placeholder">请填写内容...</p>
        </section>

        <!-- 自定义列表模块 -->
        <section v-if="sectionId.startsWith('customCard_')" class="sidebar__section" :data-section="sectionId" @click="$emit('click-section', sectionId)">
          <h2 class="main__section-title">
            <span class="main__section-icon"></span>
            {{ getSectionTitle(resume, sectionId) }}
          </h2>
          <div v-if="getCustomCardItems(sectionId).length">
            <div v-for="item in getCustomCardItems(sectionId)" :key="item.id" class="main__entry">
              <div class="main__entry-header">
                <div class="main__entry-info">
                  <h3 class="main__entry-title">{{ item.name }}</h3>
                  <p class="main__entry-subtitle">{{ item.role }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="main__entry-date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="main__entry-desc">{{ item.description }}</p>
              <div v-if="item.keywords.length" class="main__entry-tags">
                <span v-for="(kw, idx) in item.keywords" :key="idx" class="main__tech-tag">{{ kw }}</span>
              </div>
            </div>
          </div>
          <div v-else class="main__entry-placeholder">
            <div class="placeholder-row">
              <span class="placeholder-title">名称</span>
              <span class="placeholder-subtitle">角色</span>
            </div>
            <p class="placeholder-desc">请填写描述...</p>
          </div>
        </section>
      </template>
    </main>
  </div>

  <!-- ==================== 其他模板共用布局 ==================== -->
  <div
    v-else
    class="resume-document"
    :class="`resume--${templateId}`"
    :style="templateCSSVars"
  >
    <!-- 头部（基本信息） -->
    <header class="resume__header" data-section="basic" @click="$emit('click-section', 'basic')">
      <!-- 头像 -->
      <div class="header__photo">
        <img v-if="resume.basicInfo.photo" :src="resume.basicInfo.photo" :alt="resume.basicInfo.name" class="header__photo-img" />
        <div v-else class="header__photo-placeholder">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
      <div class="header__main">
        <h1 class="header__name">{{ resume.basicInfo.name || '你的姓名' }}</h1>
        <p class="header__title">{{ resume.basicInfo.title || '你的职位' }}</p>
      </div>
      <div class="header__contact">
        <span v-if="resume.basicInfo.email" class="contact__item">
          <span class="contact__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" stroke-width="1.2"/>
              <path d="M1 3L7 7L13 3" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>
          {{ resume.basicInfo.email }}
        </span>
        <span v-if="resume.basicInfo.phone" class="contact__item">
          <span class="contact__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2C2.44772 2 2 2.44772 2 3V4C2 7.5 5.5 11 9 11H10C10.5523 11 11 10.5523 11 10V9L9 8V10C6 10 4 6 4 4H6L5 2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            </svg>
          </span>
          {{ resume.basicInfo.phone }}
        </span>
        <span v-if="resume.basicInfo.location" class="contact__item">
          <span class="contact__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/>
              <path d="M7 8V13" stroke="currentColor" stroke-width="1.2"/>
              <circle cx="7" cy="5" r="1" fill="currentColor"/>
            </svg>
          </span>
          {{ resume.basicInfo.location }}
        </span>
        <span v-if="resume.basicInfo.website" class="contact__item">
          <span class="contact__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2"/>
              <path d="M1 7H13M7 1C4 3.5 4 10.5 7 13M7 1C10 3.5 10 10.5 7 13" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>
          {{ resume.basicInfo.website }}
        </span>
      </div>
    </header>

    <!-- 根据 sectionOrder 动态渲染内容模块 -->
    <template v-for="sectionId in contentSections" :key="sectionId">
      <!-- 个人简介 -->
      <section v-if="sectionId === 'summary'" class="resume__section" data-section="summary" @click="$emit('click-section', 'summary')">
        <h2 class="section__title">
          <span class="section__icon section__icon--intro"></span>
          {{ getSectionTitle(resume, 'summary') }}
        </h2>
        <p v-if="resume.basicInfo.summary" class="section__text">{{ resume.basicInfo.summary }}</p>
        <p v-else class="section__placeholder">请填写个人简介...</p>
      </section>

      <!-- 工作经历 -->
      <section v-if="sectionId === 'work'" class="resume__section" data-section="work" @click="$emit('click-section', 'work')">
        <h2 class="section__title">
          <span class="section__icon section__icon--work"></span>
          {{ getSectionTitle(resume, 'work') }}
        </h2>
        <template v-if="resume.workExperience.filter(i => !i.hidden).length">
          <div v-for="item in resume.workExperience.filter(i => !i.hidden)" :key="item.id" class="entry">
            <div class="entry__timeline">
              <span class="timeline__dot"></span>
              <span class="timeline__line"></span>
            </div>
            <div class="entry__content">
              <div class="entry__header">
                <div class="entry__info">
                  <h3 class="entry__title">{{ item.position }}</h3>
                  <p class="entry__subtitle">{{ item.company }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="entry__date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="entry__desc">{{ item.description }}</p>
              <ul v-if="item.highlights?.length" class="entry__highlights">
                <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
              </ul>
            </div>
          </div>
        </template>
        <div v-else class="entry-placeholder">
          <div class="entry-placeholder__header">
            <span class="entry-placeholder__title">职位名称</span>
            <span class="entry-placeholder__date">开始日期 - 结束日期</span>
          </div>
          <p class="entry-placeholder__subtitle">公司名称</p>
          <p class="entry-placeholder__desc">请填写工作描述...</p>
        </div>
      </section>

      <!-- 教育经历 -->
      <section v-if="sectionId === 'education'" class="resume__section" data-section="education" @click="$emit('click-section', 'education')">
        <h2 class="section__title">
          <span class="section__icon section__icon--edu"></span>
          {{ getSectionTitle(resume, 'education') }}
        </h2>
        <template v-if="resume.education.filter(i => !i.hidden).length">
          <div v-for="item in resume.education.filter(i => !i.hidden)" :key="item.id" class="entry">
            <div class="entry__timeline">
              <span class="timeline__dot timeline__dot--edu"></span>
              <span class="timeline__line"></span>
            </div>
            <div class="entry__content">
              <div class="entry__header">
                <div class="entry__info">
                  <h3 class="entry__title">{{ item.school }}</h3>
                  <p class="entry__subtitle">{{ item.degree }} · {{ item.major }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="entry__date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="entry__desc">{{ item.description }}</p>
            </div>
          </div>
        </template>
        <div v-else class="entry-placeholder">
          <div class="entry-placeholder__header">
            <span class="entry-placeholder__title">学校名称</span>
            <span class="entry-placeholder__date">开始日期 - 结束日期</span>
          </div>
          <p class="entry-placeholder__subtitle">学位 · 专业</p>
          <p class="entry-placeholder__desc">请填写教育描述...</p>
        </div>
      </section>

      <!-- 项目经验 -->
      <section v-if="sectionId === 'projects'" class="resume__section" data-section="projects" @click="$emit('click-section', 'projects')">
        <h2 class="section__title">
          <span class="section__icon section__icon--project"></span>
          {{ getSectionTitle(resume, 'projects') }}
        </h2>
        <template v-if="resume.projects.filter(i => !i.hidden).length">
          <div v-for="item in resume.projects.filter(i => !i.hidden)" :key="item.id" class="entry">
            <div class="entry__timeline">
              <span class="timeline__dot timeline__dot--project"></span>
              <span class="timeline__line"></span>
            </div>
            <div class="entry__content">
              <div class="entry__header">
                <div class="entry__info">
                  <h3 class="entry__title">{{ item.name }}</h3>
                  <p class="entry__subtitle">{{ item.role }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="entry__date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="entry__desc">{{ item.description }}</p>
              <ul v-if="item.highlights?.length" class="entry__highlights">
                <li v-for="(hl, idx) in item.highlights" :key="idx">{{ hl }}</li>
              </ul>
              <div v-if="item.technologies.length" class="entry__tags">
                <span v-for="(tech, idx) in item.technologies" :key="idx" class="tech-tag">{{ tech }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="entry-placeholder">
          <div class="entry-placeholder__header">
            <span class="entry-placeholder__title">项目名称</span>
            <span class="entry-placeholder__date">开始日期 - 结束日期</span>
          </div>
          <p class="entry-placeholder__subtitle">担任角色</p>
          <p class="entry-placeholder__desc">请填写项目描述...</p>
        </div>
      </section>

      <!-- 技能 -->
      <section v-if="sectionId === 'skills'" class="resume__section" data-section="skills" @click="$emit('click-section', 'skills')">
        <h2 class="section__title">
          <span class="section__icon section__icon--skill"></span>
          {{ getSectionTitle(resume, 'skills') }}
        </h2>
        <p v-if="getSkillsContent" class="section__text">{{ getSkillsContent }}</p>
        <p v-else class="section__placeholder">请添加技能...</p>
      </section>

      <!-- 自我评价 -->
      <section v-if="sectionId === 'evaluation'" class="resume__section" data-section="evaluation" @click="$emit('click-section', 'evaluation')">
        <h2 class="section__title">
          <span class="section__icon section__icon--eval"></span>
          {{ getSectionTitle(resume, 'evaluation') }}
        </h2>
        <p v-if="resume.selfEvaluation" class="section__text">{{ resume.selfEvaluation }}</p>
        <p v-else class="section__placeholder">请填写自我评价...</p>
      </section>

      <!-- 自定义文本模块 -->
      <section v-if="sectionId.startsWith('customText_')" class="resume__section" :data-section="sectionId" @click="$emit('click-section', sectionId)">
        <h2 class="section__title">
          <span class="section__icon section__icon--custom-text"></span>
          {{ getSectionTitle(resume, sectionId) }}
        </h2>
        <p v-if="getCustomTextContent(sectionId)" class="section__text">{{ getCustomTextContent(sectionId) }}</p>
        <p v-else class="section__placeholder">请填写内容...</p>
      </section>

      <!-- 自定义列表模块 -->
      <section v-if="sectionId.startsWith('customCard_')" class="resume__section" :data-section="sectionId" @click="$emit('click-section', sectionId)">
        <h2 class="section__title">
          <span class="section__icon section__icon--custom-card"></span>
          {{ getSectionTitle(resume, sectionId) }}
        </h2>
        <template v-if="getCustomCardItems(sectionId).length">
          <div v-for="item in getCustomCardItems(sectionId)" :key="item.id" class="entry">
            <div class="entry__timeline">
              <span class="timeline__dot"></span>
              <span class="timeline__line"></span>
            </div>
            <div class="entry__content">
              <div class="entry__header">
                <div class="entry__info">
                  <h3 class="entry__title">{{ item.name }}</h3>
                  <p class="entry__subtitle">{{ item.role }}</p>
                </div>
                <span v-if="item.startDate || item.endDate" class="entry__date">{{ formatDateRange(item.startDate, item.endDate) }}</span>
              </div>
              <p v-if="item.description" class="entry__desc">{{ item.description }}</p>
              <div v-if="item.keywords.length" class="entry__tags">
                <span v-for="(kw, idx) in item.keywords" :key="idx" class="tech-tag">{{ kw }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="entry-placeholder">
          <div class="entry-placeholder__header">
            <span class="entry-placeholder__title">名称</span>
            <span class="entry-placeholder__date">开始日期 - 结束日期</span>
          </div>
          <p class="entry-placeholder__subtitle">角色</p>
          <p class="entry-placeholder__desc">请填写描述...</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Resume } from '@/types/resume'
import { getTemplate } from '@/config/templates'
import { DEFAULT_SECTION_ORDER, getSectionTitle, getCustomSectionIndex } from '@/types/resume'

const props = defineProps<{
  resume: Resume
  templateId: string
}>()

defineEmits<{
  'click-section': [tabId: string]
}>()

// 获取可见的模块顺序
const visibleSections = computed(() => {
  const order = props.resume.sectionOrder || DEFAULT_SECTION_ORDER
  const hidden = props.resume.hiddenSections || []
  return order.filter(id => !hidden.includes(id))
})

// 获取内容模块顺序（排除 basic，因为 basic 在 header 中单独渲染）
const contentSections = computed(() => {
  return visibleSections.value.filter(id => id !== 'basic')
})

// sidebar 模板的内容模块顺序（排除 basic、skills，它们在左侧边栏）
const sidebarContentSections = computed(() => {
  return visibleSections.value.filter(id => !['basic', 'skills'].includes(id))
})

// 检查模块是否可见
const isSectionVisible = (sectionId: string): boolean => {
  return visibleSections.value.includes(sectionId)
}

const templateCSSVars = computed(() => {
  const t = getTemplate(props.templateId)
  return {
    '--t-header-bg': t.style.headerBg,
    '--t-header-text': t.style.headerTextColor,
    '--t-accent': t.style.accentColor,
    '--t-section-title': t.style.sectionTitleColor,
    '--t-text': t.style.textColor,
    '--t-text-secondary': t.style.textSecondaryColor,
    '--t-radius': t.style.sectionBorderRadius,
    '--t-tag-bg': t.style.tagBg,
    '--t-tag-color': t.style.tagColor,
    '--t-tag-border': t.style.tagBorder
  }
})

const sidebarCSSVars = computed(() => {
  const t = getTemplate('sidebar')
  return {
    '--sidebar-bg': t.style.sidebarBg || 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)',
    '--sidebar-text': t.style.sidebarTextColor || '#1e3a5f',
    '--sidebar-accent': t.style.accentColor
  }
})

// 获取技能文本内容
const getSkillsContent = computed(() => {
  return props.resume.skills?.[0]?.content || ''
})

const getCustomTextContent = (sectionId: string): string => {
  const index = getCustomSectionIndex(sectionId)
  if (index === null) return ''
  return props.resume.customTexts?.[index]?.content || ''
}

const getCustomCardItems = (sectionId: string) => {
  const index = getCustomSectionIndex(sectionId)
  if (index === null) return []
  return (props.resume.customCards?.[index]?.items || []).filter(i => !i.hidden)
}

const formatDate = (date: string) => {
  if (!date) return ''
  if (date === '至今') return '至今'
  const d = new Date(date)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatDateRange = (startDate: string, endDate: string) => {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} - ${end}`
  if (start) return start
  if (end) return end
  return ''
}
</script>

<style lang="scss" scoped>
.resume-document {
  max-width: 720px;
  margin: 0 auto;
  font-size: $font-size-sm;
  line-height: 1.7;
  color: var(--t-text);
  background: #ffffff;
  padding: 24px;

  &__header {
    text-align: center;
    padding-bottom: $spacing-xl;
    margin-bottom: $spacing-xl;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100px;
      height: 3px;
      background: var(--t-accent);
      border-radius: $radius-full;
    }
  }

  &__section {
    margin-bottom: $spacing-xl;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.85;
    }
  }
}

.header {
  &__photo {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    margin: 0 auto $spacing-md;
    background: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--t-accent);
  }

  &__photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__photo-placeholder {
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__name {
    font-size: $font-size-3xl;
    font-weight: 800;
    color: var(--t-header-text);
    margin-bottom: $spacing-xs;
    letter-spacing: -0.02em;
  }

  &__title {
    font-size: $font-size-lg;
    color: var(--t-accent);
    font-weight: 600;
    margin-bottom: $spacing-md;
  }

  &__contact {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: $spacing-md $spacing-lg;
  }
}

.contact__item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  color: var(--t-text-secondary);
  font-size: $font-size-xs;
}

.contact__icon {
  display: flex;
  color: var(--t-accent);
}

// 模块标题
.section__title {
  font-size: $font-size-md;
  font-weight: 700;
  color: var(--t-section-title);
  padding-bottom: $spacing-sm;
  margin-bottom: $spacing-lg;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: #e8e8f0;
  }
}

.section__icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--t-accent);

  &--intro { background: var(--t-accent); }
  &--work { background: var(--t-accent); }
  &--edu { background: var(--t-accent); }
  &--project { background: var(--t-accent); }
  &--skill { background: var(--t-accent); }
  &--eval { background: var(--t-accent); }
  &--custom-text { background: var(--t-accent); }
  &--custom-card { background: var(--t-accent); }
}

.section__text {
  color: var(--t-text-secondary);
  white-space: pre-wrap;
  font-size: $font-size-sm;
  line-height: 1.8;
}

.section__placeholder {
  color: var(--t-text-secondary);
  opacity: 0.6;
  font-size: $font-size-sm;
  font-style: italic;
}

// 条目时间线
.entry {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }

  &:last-child .timeline__line {
    display: none;
  }
}

.entry__timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
}

.timeline__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid var(--t-accent);
  flex-shrink: 0;

  &--edu { border-color: var(--t-accent); }
  &--project { border-color: var(--t-accent); }
}

.timeline__line {
  width: 1px;
  height: 100%;
  background: #e8e8f0;
  flex: 1;
  min-height: 20px;
}

.entry__content {
  flex: 1;
}

.entry__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: $spacing-xs;
}

.entry__info {
  display: flex;
  flex-direction: column;
}

.entry__title {
  font-size: $font-size-sm;
  font-weight: 700;
  color: var(--t-text);
}

.entry__subtitle {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
}

.entry__date {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
  padding: $spacing-xs $spacing-sm;
  background: rgba(124, 92, 252, 0.08);
  border-radius: $radius-sm;
  border: 1px solid rgba(124, 92, 252, 0.15);
}

.entry__desc {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
  white-space: pre-wrap;
  margin-top: $spacing-xs;
  line-height: 1.7;
}

.entry__tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: $spacing-sm;
}

.tech-tag {
  padding: 2px $spacing-sm;
  background: var(--t-tag-bg);
  color: var(--t-tag-color);
  border-radius: $radius-full;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--t-tag-border);
}

// 非sidebar模板的条目占位符（更明显）
.entry-placeholder {
  padding: $spacing-md;
  border: 1px dashed rgba(124, 92, 252, 0.2);
  border-radius: var(--t-radius);
  margin-bottom: $spacing-sm;
  background: rgba(124, 92, 252, 0.02);
}

.entry-placeholder__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.entry-placeholder__title {
  font-size: $font-size-sm;
  font-weight: 700;
  color: var(--t-text-secondary);
  opacity: 0.6;
}

.entry-placeholder__date {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
  opacity: 0.5;
  padding: 2px $spacing-sm;
  background: rgba(0, 0, 0, 0.03);
  border-radius: $radius-sm;
}

.entry-placeholder__subtitle {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
  opacity: 0.5;
  margin-bottom: 4px;
}

.entry-placeholder__desc {
  font-size: $font-size-xs;
  color: var(--t-text-secondary);
  opacity: 0.5;
  font-style: italic;
}

// 技能
// ==================== Classic 模版 ====================
.resume--classic {
  .resume__header {
    text-align: center;
  }
}

// ==================== Modern 模版 ====================
.resume--modern {
  .resume__header {
    text-align: left;
    background: var(--t-header-bg);
    color: var(--t-header-text);
    padding: $spacing-xl;
    border-radius: var(--t-radius);
    margin-bottom: $spacing-lg;

    &::after { display: none; }

    .header__name {
      color: var(--t-header-text);
    }

    .header__title {
      color: rgba(255, 255, 255, 0.85);
    }

    .header__contact {
      justify-content: flex-start;
    }

    .contact__item {
      color: rgba(255, 255, 255, 0.8);
    }

    .contact__icon {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  .resume__section {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: var(--t-radius);
    padding: $spacing-lg;
    margin-bottom: $spacing-md;
  }

  .section__title {
    color: var(--t-accent);

    &::after { display: none; }
  }

  .entry {
    flex-direction: column;
    gap: 0;
  }

  .entry__timeline {
    display: none;
  }

  .entry__content {
    border-left: 3px solid var(--t-accent);
    padding-left: $spacing-md;
    margin-bottom: $spacing-md;
  }

  .entry__date {
    background: var(--t-accent);
    color: #ffffff;
    border: none;
  }
}

// ==================== Minimal 模版 ====================
.resume--minimal {
  .resume__header {
    text-align: left;
    padding-bottom: $spacing-lg;
    margin-bottom: $spacing-lg;
    border-bottom: 2px solid var(--t-text);

    &::after { display: none; }

    .header__name {
      font-size: $font-size-2xl;
      font-weight: 700;
    }

    .header__title {
      font-weight: 400;
      color: var(--t-text-secondary);
    }

    .header__contact {
      justify-content: flex-start;
    }
  }

  .section__title {
    font-size: $font-size-sm;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--t-text-secondary);
    font-weight: 600;
    margin-bottom: $spacing-md;
    padding-bottom: $spacing-xs;

    &::after { display: none; }
  }

  .section__icon {
    display: none;
  }

  .entry {
    flex-direction: column;
    gap: 0;
    padding-bottom: $spacing-md;
    border-bottom: 1px solid #e8e8f0;
    margin-bottom: $spacing-md;
  }

  .entry__timeline {
    display: none;
  }

  .entry__content {
    flex: 1;
  }

  .entry__date {
    background: transparent;
    border: none;
    padding: 0;
    font-size: $font-size-xs;
    color: var(--t-text-secondary);
  }

  .tech-tag {
    background: transparent;
    border: 1px solid var(--t-text-secondary);
    color: var(--t-text-secondary);
    border-radius: 0;
  }

  .skill-row__fill {
    background: var(--t-text-secondary);
  }
}

// ==================== Timeline 模版 ====================
.resume--timeline {
  .resume__header {
    text-align: center;

    &::after {
      height: 4px;
      width: 120px;
    }
  }

  .section__title {
    font-weight: 800;

    &::after {
      height: 2px;
      background: var(--t-accent);
    }
  }

  .timeline__dot {
    width: 12px;
    height: 12px;
    background: var(--t-accent);
    border: none;
  }

  .timeline__line {
    width: 2px;
    background: var(--t-accent);
    opacity: 0.3;
  }

  .entry__date {
    background: rgba(249, 115, 22, 0.1);
    color: var(--t-accent);
    border-color: rgba(249, 115, 22, 0.2);
    font-weight: 600;
  }
}

// ==================== Elegant 模版 ====================
.resume--elegant {
  .resume__header {
    text-align: left;
    padding-bottom: $spacing-lg;
    margin-bottom: $spacing-lg;
    border-bottom: 1px solid #e5e7eb;

    &::after { display: none; }

    .header__name {
      font-size: $font-size-2xl;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .header__title {
      font-weight: 400;
      color: var(--t-accent);
      font-style: italic;
    }

    .header__contact {
      justify-content: flex-start;
    }
  }

  .section__title {
    font-weight: 700;
    letter-spacing: 0.02em;

    &::after {
      height: 2px;
      background: var(--t-accent);
      width: 40px;
    }
  }

  .entry {
    flex-direction: column;
    gap: 0;
  }

  .entry__timeline {
    display: none;
  }

  .entry__content {
    padding-left: $spacing-md;
    border-left: 2px solid var(--t-accent);
    margin-bottom: $spacing-md;
  }

  .entry__date {
    background: transparent;
    border: 1px solid #e5e7eb;
    color: var(--t-text-secondary);
  }

  .tech-tag {
    border-radius: 4px;
  }
}

// ==================== TwoColumn 模版 ====================
.resume--twocolumn {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  max-width: 800px;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;

  .resume__header {
    grid-column: 1 / -1;
    text-align: left;
    background: var(--t-header-bg);
    color: var(--t-header-text);
    padding: $spacing-xl;
    margin-bottom: 0;

    &::after { display: none; }

    .header__name {
      color: var(--t-header-text);
      font-size: $font-size-2xl;
    }

    .header__title {
      color: rgba(255, 255, 255, 0.85);
    }

    .header__contact {
      flex-direction: column;
      align-items: flex-start;
      gap: $spacing-sm;
    }

    .contact__item {
      color: rgba(255, 255, 255, 0.8);
      font-size: $font-size-xs;
    }

    .contact__icon {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  // 左侧栏
  .resume__section:first-of-type {
    grid-column: 1;
    padding: $spacing-lg;
    background: rgba(0, 0, 0, 0.03);
    border-right: 1px solid rgba(0, 0, 0, 0.06);
  }

  // 右侧内容区
  .resume__section:not(:first-of-type) {
    grid-column: 2;
    padding: $spacing-lg;
  }

  .section__title {
    font-size: $font-size-xs;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--t-accent);
    font-weight: 700;

    &::after { display: none; }
  }

  .section__icon {
    display: none;
  }

  .entry {
    flex-direction: column;
    gap: 0;
  }

  .entry__timeline {
    display: none;
  }

  .entry__content {
    margin-bottom: $spacing-md;
  }

  .entry__date {
    background: var(--t-accent);
    color: #ffffff;
    border: none;
    font-size: 10px;
  }

  .skills-grid {
    grid-template-columns: 1fr;
  }
}

// ==================== Sidebar 模版 ====================
.resume--sidebar {
  display: grid;
  grid-template-columns: 240px 1fr;
  max-width: 800px;
  min-height: 1050px;
  padding: 0;
  overflow: hidden;
  font-size: 13px;
}

// 左侧边栏
.sidebar__left {
  background: var(--sidebar-bg);
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--sidebar-text);
}

.sidebar__photo-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.sidebar__photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.4);
}

.sidebar__photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar__photo-placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar__identity {
  text-align: center;
}

.sidebar__name {
  font-size: 18px;
  font-weight: 800;
  color: #1e3a5f;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

.sidebar__title {
  font-size: 12px;
  color: #3b6ba5;
  font-weight: 500;
}

.sidebar__contact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar__contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #2d5a8e;
  word-break: break-all;
}

.sidebar__contact-icon {
  display: flex;
  flex-shrink: 0;
  color: #3b82f6;
}

// 侧边栏 section 标题
.sidebar__section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #1e3a5f;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar__section-line {
  width: 16px;
  height: 2px;
  background: #3b82f6;
  border-radius: 1px;
}

// 技能
.sidebar__skill-text {
  font-size: 11px;
  color: #1e3a5f;
  line-height: 1.8;
  white-space: pre-wrap;
}

// 右侧主内容区
.sidebar__right {
  padding: 28px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar__section {
  margin-bottom: 0;
}

// 右侧 section 标题
.main__section-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e3a5f;
  padding-bottom: 8px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 2px solid #3b82f6;
  position: relative;
}

.main__section-icon {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
}

.main__section-text {
  font-size: 12px;
  color: #4a5568;
  line-height: 1.8;
}

// 条目
.main__entry {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f5;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

.main__entry-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}

.main__entry-info {
  display: flex;
  flex-direction: column;
}

.main__entry-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a202c;
}

.main__entry-subtitle {
  font-size: 11px;
  color: #718096;
}

.main__entry-date {
  font-size: 10px;
  color: #ffffff;
  background: #3b82f6;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
}

.main__entry-desc {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.7;
  margin-top: 6px;
}

.main__entry-highlights {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.main__entry-highlights li {
  font-size: 11px;
  color: #4a5568;
  line-height: 1.6;
  padding-left: 14px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #93c5fd;
  }
}

.main__entry-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.main__tech-tag {
  padding: 2px 10px;
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

// 占位符样式（更明显的灰色）
.main__section-placeholder {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  padding: 4px 0;
}

.main__entry-placeholder {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f5;

  &:last-child {
    border-bottom: none;
  }
}

.placeholder-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.placeholder-title {
  font-size: 13px;
  font-weight: 700;
  color: #9ca3af;
}

.placeholder-subtitle {
  font-size: 11px;
  color: #d1d5db;
}

.placeholder-desc {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

// Sidebar section 可点击
.sidebar__section {
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

.main__entry-date.placeholder-date {
  font-size: 10px;
  color: #9ca3af;
  background: #f3f4f6;
}

// 侧边栏空数据提示
.sidebar__empty-hint {
  font-size: 10px;
  color: #9ca3af;
  font-style: italic;
  padding: 4px 0;
}
</style>