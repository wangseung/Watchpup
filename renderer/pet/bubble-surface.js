export function bubbleSurfaceState({ active, showActivityHud, activityCount }) {
  const useHud = !!showActivityHud
  const hasActivities = Number(activityCount) > 0
  return {
    bubbleVisible: !!active && !useHud,
    hudMessageVisible: !!active && useHud,
    hudVisible: useHud && (!!active || hasActivities),
  }
}

export function hudFoldContent({ activityCount, bubbleActive, folded }) {
  const count = Math.max(0, Number(activityCount) || 0) + Number(!!bubbleActive)
  return {
    count,
    countLabel: `항목 ${count}개`,
    actionLabel: folded ? '펼치기' : '접기',
  }
}
