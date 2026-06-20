/**
 * 评估分数相关工具函数
 * 供 ResumeEvaluationModal（评估弹窗）和 ResumeCard（简历卡片徽章）复用，
 * 避免分数色值阈值逻辑在两处重复维护。
 */

/** 分数对应的主色（绿/黄/红三档） */
export function getScoreColor(score: number | null): string {
  if (score === null) return 'transparent'
  if (score >= 80) return '#34d399'
  if (score >= 60) return '#fbbf24'
  return '#f87171'
}

/** 分数对应的等级文案 */
export function getScoreLabel(score: number | null): string {
  if (score === null) return ''
  if (score >= 80) return '优秀'
  if (score >= 60) return '良好'
  return '待改进'
}

/** 将 ISO 时间戳格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
