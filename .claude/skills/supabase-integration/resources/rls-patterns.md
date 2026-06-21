# RLS Policy Patterns

Phase 3에서 참조. 사용자 답변을 아래 패턴 중 하나에 매핑한다.

---

## 기본 원칙

1. **모든 테이블**: `alter table {table} enable row level security;` 먼저 적용
2. **DENY by default** — RLS 활성화 + 정책 없음 = 모든 접근 차단
3. **정책은 동사별 분리** — SELECT/INSERT/UPDATE/DELETE 각각
4. **auth.uid()** — 현재 로그인 사용자 UUID. 비로그인이면 NULL
5. **security invoker가 기본** — 정책은 호출자 권한으로 실행됨

---

## 패턴 카탈로그

### 패턴 A — owner-only (본인만 모든 것)

**언제**: 개인 메모, 북마크, 설정 등.

```sql
alter table public.private_notes enable row level security;

create policy "private_notes_select_own"
  on public.private_notes for select
  using (auth.uid() = user_id);

create policy "private_notes_insert_own"
  on public.private_notes for insert
  with check (auth.uid() = user_id);

create policy "private_notes_update_own"
  on public.private_notes for update
  using (auth.uid() = user_id);

create policy "private_notes_delete_own"
  on public.private_notes for delete
  using (auth.uid() = user_id);
```

**주의**: INSERT는 `with check`, 나머지는 `using`. UPDATE는 둘 다 쓰는 게 안전(변경 후 행도 검증).

---

### 패턴 B — public-read-owner-write (모두 읽기, 본인만 쓰기)

**언제**: 블로그 포스트, 공개 프로필, 댓글.

```sql
alter table public.posts enable row level security;

create policy "posts_select_all"
  on public.posts for select
  using (true);

create policy "posts_insert_authenticated"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);
```

**주의**: `to authenticated`로 비로그인 사용자 차단. 읽기는 `to public` (생략 시 기본값).

---

### 패턴 C — authenticated-read-owner-write (로그인 사용자만 읽기)

**언제**: 멤버 전용 컨텐츠.

```sql
create policy "select_authenticated"
  on public.members_only for select
  to authenticated
  using (true);
-- INSERT/UPDATE/DELETE는 패턴 B와 동일
```

---

### 패턴 D — role-based (역할 기반)

**언제**: admin만 관리 가능한 테이블.

전제: `profiles` 테이블에 `role user_role not null default 'user'` 컬럼 존재.

```sql
-- helper 함수 (한 번만 정의)
create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 정책
create policy "announcements_select_all"
  on public.announcements for select
  using (true);

create policy "announcements_admin_write"
  on public.announcements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

**주의**: `is_admin()`은 `security definer + stable`로 선언 — RLS 재귀 방지 + 쿼리 플래너 최적화.

---

### 패턴 E — member-of-team (팀/조직 멤버십 기반)

**언제**: 팀 리소스 (문서, 프로젝트).

전제: `team_members` junction 테이블 존재.

```sql
-- helper
create or replace function public.is_team_member(team uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = team and user_id = auth.uid()
  );
$$;

create policy "documents_team_read"
  on public.documents for select
  to authenticated
  using (public.is_team_member(team_id));

create policy "documents_team_write"
  on public.documents for insert
  to authenticated
  with check (public.is_team_member(team_id));
```

---

### 패턴 F — junction 테이블 RLS

**언제**: likes, post_tags 등 N:M 테이블.

```sql
alter table public.likes enable row level security;

-- 누가 좋아요 했는지는 모두 조회 가능
create policy "likes_select_all"
  on public.likes for select using (true);

-- 본인만 좋아요 추가/삭제
create policy "likes_insert_own"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- UPDATE 정책 없음 → UPDATE 불가 (의도된 동작)
```

---

### 패턴 G — profiles (특수 케이스)

profile insert는 `handle_new_user` 트리거가 수행하므로 INSERT 정책 **불필요** (트리거는 `security definer`로 RLS 우회).

```sql
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT 정책 없음 (트리거 전용)
-- DELETE 정책 없음 (auth.users cascade로 삭제됨)
```

---

## 사용자 질문 → 패턴 매핑 표

| 사용자 답변 | 매핑 패턴 |
|-----------|----------|
| "본인만 볼 수 있어야 해" | A (owner-only) |
| "모두 보고, 작성자만 수정" | B (public-read-owner-write) |
| "로그인한 사람만 볼 수 있어" | C (authenticated-read) |
| "관리자만 쓸 수 있어" | D (role-based) |
| "팀/조직 단위로 공유" | E (member-of-team) |
| "좋아요/태그 같은 연결 테이블" | F (junction) |
| "프로필" | G (profiles) |

---

## 성능 주의사항

- 정책 안의 서브쿼리는 **모든 행에서** 평가됨 → `security definer + stable` helper 함수로 감싸기
- `auth.uid()`는 비용 낮음, 자유롭게 사용 가능
- 조인 성능 저하 시 → FK 인덱스 확인 (`schema-patterns.md`의 `idx_*_user_id` 등)

---

## 검증 쿼리 (Phase 3 끝)

```sql
-- RLS가 활성화 안 된 public 테이블 찾기 (반드시 0개)
select tablename from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- 정책이 하나도 없는 RLS 활성 테이블 (리뷰 필요)
select c.relname
from pg_class c
left join pg_policy p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relrowsecurity = true
  and p.polname is null;
```
