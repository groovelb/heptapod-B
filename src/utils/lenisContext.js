import { createContext } from 'react';

/**
 * 전역 Lenis smooth-scroll 인스턴스 공유 컨텍스트.
 * 히어로 인트로가 스크롤을 잠그고/풀기 위해(lenis.stop()/start()) 인스턴스에 접근한다.
 * App이 Lenis 생성 후 value로 제공, 소비처는 useContext(LenisContext)로 읽는다.
 */
export const LenisContext = createContext(null);
