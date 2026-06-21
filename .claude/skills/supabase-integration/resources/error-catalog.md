# Error Catalog

Phase 4에서 `src/utils/errorMessages.js` 생성 시 사용. Supabase 에러 코드/메시지를 한국어로 매핑.

---

## `src/utils/errorMessages.js`

```js
/**
 * Supabase 에러 코드/메시지 → 한국어 매핑
 * 키: PostgREST error code | Supabase Auth error code | 영문 message
 */
export const ERROR_MESSAGES = {
  // ========== Auth ==========
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
  'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요',
  'User already registered': '이미 등록된 이메일입니다',
  'Email rate limit exceeded': '너무 많은 요청입니다. 잠시 후 다시 시도해주세요',
  'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다',
  'Unable to validate email address: invalid format': '올바른 이메일 형식이 아닙니다',
  'Signup requires a valid password': '비밀번호를 입력해주세요',
  'For security purposes, you can only request this after': '보안을 위해 잠시 후 다시 시도해주세요',
  'New password should be different from the old password': '기존 비밀번호와 동일합니다',
  'Token has expired or is invalid': '인증 링크가 만료되었습니다',
  'User not found': '존재하지 않는 사용자입니다',

  // ========== PostgREST (DB) ==========
  '23505': '이미 존재하는 값입니다',              // unique_violation
  '23503': '참조된 데이터를 찾을 수 없습니다',    // foreign_key_violation
  '23502': '필수 입력 항목이 비어있습니다',       // not_null_violation
  '23514': '입력값이 조건을 만족하지 않습니다',   // check_violation
  '22P02': '잘못된 형식입니다',                   // invalid_text_representation
  '42501': '접근 권한이 없습니다',                // insufficient_privilege (RLS 차단)
  'PGRST116': '요청한 데이터를 찾을 수 없습니다', // no rows returned (single)
  'PGRST301': '세션이 만료되었습니다',            // JWT expired

  // ========== Network ==========
  'Failed to fetch': '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요',
  'TypeError: Network request failed': '네트워크 오류가 발생했습니다',

  // ========== Storage (필요 시 확장) ==========
  'The resource was not found': '파일을 찾을 수 없습니다',
  'Payload too large': '파일 크기가 너무 큽니다',
  'Mime type not supported': '지원하지 않는 파일 형식입니다',
};

/**
 * 필드 단위 에러 맵 — 폼에서 필드별 인라인 에러 표시 시 사용
 * key: 에러 메시지/코드 → { field: 에러 대상 필드명, message: 한국어 메시지 }
 */
export const FIELD_ERRORS = {
  'Invalid login credentials': { field: 'password', message: '이메일 또는 비밀번호가 올바르지 않습니다' },
  'User already registered': { field: 'email', message: '이미 등록된 이메일입니다' },
  '23505': { field: 'unknown', message: '이미 존재하는 값입니다' },
};
```

---

## 추가 시 규칙

1. 새 에러 발견 시: 영문 메시지 또는 코드를 키로 `ERROR_MESSAGES`에 추가
2. 에러 메시지는 **사용자 행동 가능한 문장**으로 작성 ("X 해주세요" 형태)
3. 기술적 세부사항(SQL state, stack) 노출 금지
4. 공격 힌트 제공 금지 (예: "사용자 없음" + "비밀번호 틀림"은 통합 메시지로 — `Invalid login credentials`)

---

## 사용 예시

```jsx
// 컴포넌트 내
const { signIn, error } = useSignIn();

return (
  <>
    {error && <Alert severity="error">{error.message}</Alert>}
    <Button onClick={() => signIn({ email, password })}>로그인</Button>
  </>
);
```
