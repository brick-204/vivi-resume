/**
 * 「我的面试」tab 的数据模型与工具函数。
 * 与 consult.ts 同风格：类型定义 + 纯函数 + 工厂函数。
 */

import { generateId } from '@/types/resume'

export type InterviewStatus = 'drafting' | 'submitted' | 'interviewing' | 'offer' | 'rejected' | 'closed'
export type RoundType = 'first' | 'second' | 'hr' | 'final' | 'other'
export type RoundStatus = 'pending' | 'done' | 'passed' | 'failed'
export type InterviewSegment = 'upcoming' | 'ongoing' | 'ended'
export type InterviewFormat = 'onsite' | 'video' | 'phone'

export interface InterviewRound {
  id: string
  roundType: RoundType
  scheduledAt: string | null   // ISO，待面可空
  status: RoundStatus
  format: InterviewFormat | null
  interviewer: string          // 面试官姓名职务
  questions: string            // 面试问题（多行文本）
  answers: string              // 回答记录（多行文本）
  result: string
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
    roundType: 'first',
    scheduledAt: null,
    status: 'pending',
    format: null,
    interviewer: '',
    questions: '',
    answers: '',
    result: '',
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
