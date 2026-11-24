export const idleHand = { x: .5, y: .5, present: false, gesture: 'idle' }

const fingers = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]]
const trackingGraceMs = 700

// 进入某手势需要持续的时间；只做最小限度的去抖，保证跟手
const confirmation = { fist: 120, pinch: 60, open: 60, hover: 90 }
// 只在离开捏合/握拳时保留短暂容错，其余切换立即响应
const releaseDelay = { pinch: 60, fist: 60, open: 0, hover: 0 }

// 捏合双阈值：进入严格、退出宽松，抓着照片时手指轻微张开不会中断
const pinchEnter = .35
const pinchExit = .58
// 手掌过远时关键点噪声很大，直接不判定捏合/握拳
const minPalm = .045

export function createHandTracker() {
  let current = idleHand
  let lastSeen = -Infinity
  let candidate = 'idle'
  let candidateSince = 0
  let candidateFrames = 0
  let separatedSince = null
  let missingFrames = 0
  let gap = null
  let palmSize = null

  return (marks, aspect, now, worldMarks) => {
    if (!marks) {
      candidate = current.gesture
      candidateSince = now
      candidateFrames = 0
      separatedSince = null
      gap = null
      palmSize = null
      missingFrames++
      if (missingFrames >= 4 && now - lastSeen > trackingGraceMs) current = idleHand
      return current
    }
    lastSeen = now
    missingFrames = 0

    // World landmarks preserve finger separation when a palm turns toward its edge.
    const hasDepth = worldMarks?.length === 21
    const points = hasDepth ? worldMarks : marks
    const xScale = hasDepth ? 1 : aspect
    const vector = (a, b) => [
      (points[b].x - points[a].x) * xScale,
      points[b].y - points[a].y,
      hasDepth ? points[b].z - points[a].z : 0,
    ]
    const distance = (a, b) => Math.hypot(...vector(a, b))
    const palm = Math.max(.018, distance(0, 9), distance(5, 17) * .96)
    // 手掌尺寸与虎口间距做低通，单帧关键点跳动不会直接翻转手势
    palmSize = palmSize === null ? palm : palmSize + (palm - palmSize) * .5
    // 合拢方向响应快、张开方向平滑，既跟手又不抖
    const rawGap = distance(4, 8) / Math.max(palmSize, .001)
    gap = gap === null ? rawGap : rawGap < gap ? gap + (rawGap - gap) * .8 : gap + (rawGap - gap) * .65

    const fullyCurled = fingers.every(([base, joint, tip]) => {
      const inward = vector(base, joint)
      const outward = vector(joint, tip)
      const alignment = inward.reduce((sum, component, i) => sum + component * outward[i], 0)
      return alignment < .42 * Math.hypot(...inward) * Math.hypot(...outward)
        && distance(tip, base) < palmSize * .58
        && distance(tip, 0) < distance(joint, 0) * 1.02
    })
    const fullyOpen = fingers.every(([, joint, tip]) => distance(tip, 0) > distance(joint, 0) * 1.17)
    const thumbToPalm = distance(4, 9)
    const thumbTucked = thumbToPalm < palmSize * .74 && thumbToPalm < distance(3, 9) + palmSize * .06
    const nearEnough = palmSize > minPalm
    const fist = nearEnough && fullyCurled && thumbTucked
    const pinch = nearEnough && !fist && gap < (current.gesture === 'pinch' ? pinchExit : pinchEnter)

    let next = 'hover'
    if (fist) next = 'fist'
    else if (pinch) next = 'pinch'
    else if (fullyOpen) next = 'open'

    if (next !== candidate) {
      candidate = next
      candidateSince = now
      candidateFrames = 0
    }
    candidateFrames++

    let gesture = current.present ? current.gesture : 'hover'
    if (next !== gesture && releaseDelay[gesture] > 0) {
      // 松手/张开时先保持一会，同时新姿势本身也要满足确认时长，避免直接跳变
      separatedSince ??= now
      const enoughFrames = next !== 'fist' || candidateFrames >= 3
      if (enoughFrames && now - separatedSince >= releaseDelay[gesture] && now - candidateSince >= confirmation[next]) gesture = next
    } else {
      separatedSince = null
      const enoughFrames = next !== 'fist' || candidateFrames >= 3
      if (enoughFrames && now - candidateSince >= confirmation[next]) gesture = next
    }

    const x = Math.min(1, Math.max(0, 1 - marks[8].x))
    const y = Math.min(1, Math.max(0, marks[8].y))
    const smoothing = current.present && current.gesture !== 'fist' ? .38 : 1
    current = {
      x: current.x + (x - current.x) * smoothing,
      y: current.y + (y - current.y) * smoothing,
      present: true,
      gesture,
    }
    return current
  }
}
