# Schema Patterns

Phase 1에서 반드시 참조. 모든 테이블에 공통 적용할 규칙과, 자주 쓰이는 엔티티 스키마 템플릿.

---

## 공통 규칙 (모든 테이블에 적용)

### 필수 컬럼

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

- `id`: Supabase 권장 — UUID v4, `gen_random_uuid()` 사용 (pgcrypto 기본 제공)
- `created_at`, `updated_at`: 타임존 포함 필수 (`timestamptz`)

**예외**: `auth.users`를 확장하는 `profiles` 테이블은 `id uuid primary key references auth.users(id) on delete cascade` 사용 (uuid 직접 참조).

### 반드시 함께 생성할 것

1. `updated_at` 컬럼이 있으면 **반드시** `set_updated_at` 트리거 부착 (`trigger-patterns.md`)
2. FK를 만들면 `on delete` 정책 명시 (CASCADE / RESTRICT / SET NULL)
3. 검색/조인에 쓰일 FK 컬럼은 **인덱스 생성**

### 금지 사항

- `serial`, `bigserial`, `integer` PK 사용 금지 → uuid만
- `varchar(n)` 사용 금지 → `text` (PostgreSQL에서는 성능 차이 없고 제약만 부담)
- `timestamp without time zone` 사용 금지 → `timestamptz`
- 스키마 이름 생략 금지 → `public.` 명시 (트리거 등에서 모호성 방지)

---

## 자주 쓰이는 엔티티 템플릿

### profiles (auth.users 확장)

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_nickname on public.profiles(nickname);
```

### posts (소유자 기반 컨텐츠)

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_created_at on public.posts(created_at desc);
```

### comments (N:1 with post, N:1 with user)

```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_post_id on public.comments(post_id);
create index idx_comments_user_id on public.comments(user_id);
```

### likes (N:M junction, 중복 방지)

```sql
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index idx_likes_post_id on public.likes(post_id);
```

### tags + post_tags (N:M with metadata)

```sql
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
```

### teams + team_members (협업 모델)

```sql
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type team_role as enum ('owner', 'admin', 'member');

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index idx_team_members_user_id on public.team_members(user_id);
```

### soft delete 적용 엔티티

```sql
-- 소프트 삭제 적용 시 추가 컬럼
deleted_at timestamptz

-- 조회 시 필터
where deleted_at is null
```

**권장**: 소프트 삭제는 복원이 중요한 엔티티(posts, comments)에만. 관계 테이블/인증 테이블은 hard delete.

---

## Enum 패턴

enum은 값이 **거의 안 바뀌는** 경우에만. 자주 바뀌면 별도 lookup 테이블로.

```sql
create type post_status as enum ('draft', 'published', 'archived');
create type user_role as enum ('user', 'admin');
```

---

## JSONB 사용 기준

- **써도 되는 경우**: 구조가 유동적인 메타데이터(preferences, settings)
- **쓰지 말 것**: 조회/정렬/조인에 쓰이는 필드 (반드시 컬럼으로)
- JSONB 필드에 인덱스 걸 땐 `gin` 인덱스

```sql
preferences jsonb not null default '{}'::jsonb
create index idx_profiles_prefs on public.profiles using gin (preferences);
```

---

## 마이그레이션 파일 네이밍

```
supabase/migrations/
  20260423120000_init_schema.sql        ← Phase 1
  20260423120100_auth_profiles.sql      ← Phase 2
  20260423120200_rls_policies.sql       ← Phase 3
```

- 타임스탬프는 `supabase migration new` 명령이 자동 생성
- 파일명은 소문자 + 언더스코어
