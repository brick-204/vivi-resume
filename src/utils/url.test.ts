import { describe, it, expect } from 'vitest'
import { extractMeetingUrl } from '@/utils/url'

describe('extractMeetingUrl', () => {
  it('提取带协议的完整 URL', () => {
    expect(extractMeetingUrl('https://meeting.tencent.com/abc123')).toBe('https://meeting.tencent.com/abc123')
  })

  it('从「别字+链接+别字」中提取带协议的 URL', () => {
    expect(extractMeetingUrl('会议链接：https://meeting.tencent.com/abc 请准时参加')).toBe('https://meeting.tencent.com/abc')
  })

  it('裸域名补全 https://', () => {
    expect(extractMeetingUrl('meeting.tencent.com/abc')).toBe('https://meeting.tencent.com/abc')
  })

  it('从「别字+裸域名+别字」中提取并补协议', () => {
    expect(extractMeetingUrl('链接 zoom.us/j/123 看看')).toBe('https://zoom.us/j/123')
  })

  it('纯会议号（非 URL）提取不到返回空串', () => {
    expect(extractMeetingUrl('123-456-789')).toBe('')
  })

  it('空值返回空串', () => {
    expect(extractMeetingUrl('')).toBe('')
    expect(extractMeetingUrl(null)).toBe('')
    expect(extractMeetingUrl(undefined)).toBe('')
  })

  it('剥离尾部英文标点（逗号/句号/分号/感叹号）', () => {
    expect(extractMeetingUrl('会议链接：https://foo.com, 请参加')).toBe('https://foo.com')
    expect(extractMeetingUrl('https://foo.com/abc.')).toBe('https://foo.com/abc')
    expect(extractMeetingUrl('https://foo.com/abc; 备注')).toBe('https://foo.com/abc')
    expect(extractMeetingUrl('https://foo.com/abc!')).toBe('https://foo.com/abc')
  })

  it('多个 URL 只取首个', () => {
    expect(extractMeetingUrl('先 https://a.com/1 再 https://b.com/2')).toBe('https://a.com/1')
  })

  it('含 query 与 fragment 的 URL 完整保留', () => {
    expect(extractMeetingUrl('https://meeting.tencent.com/abc?pwd=123#room')).toBe('https://meeting.tencent.com/abc?pwd=123#room')
  })
})
