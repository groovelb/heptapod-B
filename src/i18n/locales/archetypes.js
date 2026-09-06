import { narrativesKo } from './archetypeNarratives.ko.js';
import { narrativesEn } from './archetypeNarratives.en.js';

// Register each sentence so the existing source-string locale lookup stays exact.
function narrativeMessages(records) {
  return Object.fromEntries(Object.entries(records).flatMap(([id, record]) =>
    Object.entries(record).flatMap(([field, value]) => Array.isArray(value)
      ? value.map((sentence, index) => [`archetype.${id}.${field}.${index}`, sentence])
      : [[`archetype.${id}.${field}`, value]])));
}

/** Authored project readings of glyph geometry, never personality claims. */
export const archetypeKo = Object.freeze({
  'archetype.arrival.none.title': '첫 신호',
  'archetype.arrival.simultaneity.title': '시간의 전령',
  'archetype.arrival.openness.title': '문턱의 개척자',
  'archetype.arrival.trace.title': '흔적의 전달자',
  'archetype.arrival.simultaneity+openness.title': '먼 순간의 방문자',
  'archetype.arrival.simultaneity+trace.title': '기억의 전령',
  'archetype.arrival.openness+trace.title': '여운을 남기는 방문자',
  'archetype.arrival.simultaneity+openness+trace.title': '시간 너머의 전령',
  'archetype.reception.none.title': '고요한 그릇',
  'archetype.reception.simultaneity.title': '순간의 수집가',
  'archetype.reception.openness.title': '열린 청자',
  'archetype.reception.trace.title': '기억의 보관자',
  'archetype.reception.simultaneity+openness.title': '시간을 맞는 문',
  'archetype.reception.simultaneity+trace.title': '겹친 기억의 청자',
  'archetype.reception.openness+trace.title': '흔적을 품는 안식처',
  'archetype.reception.simultaneity+openness+trace.title': '시간을 품는 그릇',
  'archetype.reciprocity.none.title': '마주한 목소리',
  'archetype.reciprocity.simultaneity.title': '동시의 대화자',
  'archetype.reciprocity.openness.title': '경계의 가교',
  'archetype.reciprocity.trace.title': '메아리의 응답자',
  'archetype.reciprocity.simultaneity+openness.title': '순간을 잇는 문',
  'archetype.reciprocity.simultaneity+trace.title': '기억의 연결자',
  'archetype.reciprocity.openness+trace.title': '경계를 건너는 메아리',
  'archetype.reciprocity.simultaneity+openness+trace.title': '끝과 시작의 매개자',
  ...narrativeMessages(narrativesKo),
});

export const archetypeEn = Object.freeze({
  'archetype.arrival.none.title': 'First signal',
  'archetype.arrival.simultaneity.title': 'Messenger of time',
  'archetype.arrival.openness.title': 'Threshold pioneer',
  'archetype.arrival.trace.title': 'Bearer of traces',
  'archetype.arrival.simultaneity+openness.title': 'Visitor from a distant moment',
  'archetype.arrival.simultaneity+trace.title': 'Messenger of memory',
  'archetype.arrival.openness+trace.title': 'Visitor who leaves an echo',
  'archetype.arrival.simultaneity+openness+trace.title': 'Messenger beyond time',
  'archetype.reception.none.title': 'Quiet vessel',
  'archetype.reception.simultaneity.title': 'Collector of moments',
  'archetype.reception.openness.title': 'Open listener',
  'archetype.reception.trace.title': 'Keeper of memory',
  'archetype.reception.simultaneity+openness.title': 'Door welcoming time',
  'archetype.reception.simultaneity+trace.title': 'Listener to layered memories',
  'archetype.reception.openness+trace.title': 'Shelter for traces',
  'archetype.reception.simultaneity+openness+trace.title': 'Vessel of time',
  'archetype.reciprocity.none.title': 'Voices meeting',
  'archetype.reciprocity.simultaneity.title': 'Simultaneous speaker',
  'archetype.reciprocity.openness.title': 'Bridge at the boundary',
  'archetype.reciprocity.trace.title': 'Answering echo',
  'archetype.reciprocity.simultaneity+openness.title': 'Door between moments',
  'archetype.reciprocity.simultaneity+trace.title': 'Connector of memories',
  'archetype.reciprocity.openness+trace.title': 'Echo across the boundary',
  'archetype.reciprocity.simultaneity+openness+trace.title': 'Mediator of ends and beginnings',
  ...narrativeMessages(narrativesEn),
});
