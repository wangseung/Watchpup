// 등록된 워크플로우(playbook) 공유 캐시 — 멘션 액션 버튼과 설정 CRUD 양쪽이 참조.
// 재할당 대신 list 프로퍼티를 갱신해 모듈 간 공유가 유지되게 한다.
export const playbooks = { list: [] }

export function playbookById(id) {
  return playbooks.list.find((p) => p.id === id)
}
