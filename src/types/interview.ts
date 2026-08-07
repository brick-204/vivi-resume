/**
 * 「我的面试」tab 的数据模型与工具函数。
 * 与 consult.ts 同风格：类型定义 + 纯函数 + 工厂函数。
 */

import { generateId } from '@/types/resume'

export type InterviewStatus = 'drafting' | 'submitted' | 'interviewing' | 'offer' | 'rejected' | 'closed'
export type RoundStatus = 'pending' | 'done' | 'passed' | 'failed'
export type InterviewSegment = 'upcoming' | 'ongoing' | 'ended'
export type InterviewFormat = 'onsite' | 'video' | 'phone'

/** AI 结果缓存（三个功能各自缓存最新一次，随面试持久化） */
export interface MockInterviewResult {
  text: string
  generatedAt: string
}
export interface InterviewReviewResult {
  text: string
  generatedAt: string
}
export interface InterviewJdScanResult {
  score: number | null
  text: string
  scannedAt: string
}

/** AI 择业比较结果缓存（全局最近一次，跨多条面试，存 meta 不挂单条面试） */
export interface CareerChoiceResult {
  text: string
  /** 推荐公司名（从 text 首行提取，便于 UI 直接展示） */
  recommendationCompany: string
  /** 置信度 0-100，缺失为 null */
  confidence: number | null
  /** 参与比较的面试 id 列表（仅记录，不复用——每次都重新生成） */
  selectedIds: string[]
  generatedAt: string
}

export interface InterviewRound {
  id: string
  roundType: string            // 轮次类型，预设可选项 + 用户自定义（如「三面」「加面」）
  scheduledAt: string | null   // ISO，待面可空
  status: RoundStatus
  format: InterviewFormat | null
  interviewer: string          // 面试官姓名职务
  meetingLink: string          // 面试链接（腾讯会议 / Zoom / Meet 等）
  questions: string            // 面试问题（多行文本）
  answers: string              // 回答记录（多行文本）
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Interview {
  id: string
  company: string
  position: string
  status: InterviewStatus
  jd: string
  salary: string
  location: string
  // 高德 POI 经纬度（面试足迹 tab 标点用，可选——旧数据无此字段时地图侧 geocode 兜底）
  locationLng?: number
  locationLat?: number
  // 工作地点是否经 POI 搜索定位（true=经纬度来自 POI 搜索，准确；未标记=手输/geocode 兜底）
  locationPoiSelected?: boolean
  // 工作地点 geocode 是否失败（true=足迹 tab 跳过该地址不重试，用户改地址后清除）
  locationGeocodeFailed?: boolean
  // 工作地点是否同面试地点（勾选状态持久化，可选——旧数据无此字段视为 false）
  locationSameAsInterview?: boolean
  channel: string
  resumeId: string | null
  contactName: string
  contactInfo: string
  interviewLocation: string
  // 面试地点经纬度（POI 搜索选中后存，可选）
  interviewLocationLng?: number
  interviewLocationLat?: number
  // 面试地点是否经 POI 搜索定位
  interviewLocationPoiSelected?: boolean
  // 面试地点 geocode 是否失败（同 locationGeocodeFailed）
  interviewLocationGeocodeFailed?: boolean
  benefits: string             // 福利待遇（多行文本）
  rounds: InterviewRound[]
  // AI 结果缓存（可选，各功能最新一次）
  lastMockInterview?: MockInterviewResult
  lastReview?: InterviewReviewResult
  lastJdScan?: InterviewJdScanResult
  // AI 择业推荐反查标记：该面试曾被 AI 择业推荐为最优选择（清旧加新，任意时刻最多一场为 true）
  careerChoiceRecommended?: boolean
  // 软删除标记：移入回收站时写入，恢复时置 undefined（与 Resume.deletedAt 同名同义）
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 三段分区推断纯函数：纯按 status 映射。
 * drafting/submitted → upcoming，interviewing → ongoing，offer/rejected/closed → ended。
 */
export function inferInterviewSegment(interview: Interview): InterviewSegment {
  switch (interview.status) {
    case 'drafting':
    case 'submitted':
      return 'upcoming'
    case 'interviewing':
      return 'ongoing'
    case 'offer':
    case 'rejected':
    case 'closed':
      return 'ended'
  }
}

/** 工厂：新建一轮空白面试（默认 first 轮、pending、无 format/时间） */
export function createEmptyRound(): InterviewRound {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    roundType: '一面',
    scheduledAt: null,
    status: 'pending',
    format: null,
    interviewer: '',
    meetingLink: '',
    questions: '',
    answers: '',
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

/** 工厂：新建一条空白面试记录（drafting、无轮次、未关联简历） */
export function createEmptyInterview(): Interview {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    company: '',
    position: '',
    status: 'drafting',
    jd: '',
    salary: '',
    location: '',
    channel: '',
    resumeId: null,
    contactName: '',
    contactInfo: '',
    interviewLocation: '',
    benefits: '',
    rounds: [],
    createdAt: now,
    updatedAt: now,
  }
}
