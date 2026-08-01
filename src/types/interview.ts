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
  channel: string
  resumeId: string | null
  contactName: string
  contactInfo: string
  interviewLocation: string
  rounds: InterviewRound[]
  // AI 结果缓存（可选，各功能最新一次）
  lastMockInterview?: MockInterviewResult
  lastReview?: InterviewReviewResult
  lastJdScan?: InterviewJdScanResult
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
    rounds: [],
    createdAt: now,
    updatedAt: now,
  }
}
