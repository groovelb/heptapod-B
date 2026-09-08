import { NextResponse } from 'next/server';
import { legacyCanvasLocation } from './src/routes/paths.js';

/** Resolve old bookmarks before streaming starts, preserving the original encoder version. */
export function proxy(request) {
  const legacy = legacyCanvasLocation({ search: request.nextUrl.search });
  if (!legacy) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = legacy.pathname;
  destination.search = legacy.search;
  return NextResponse.redirect(destination, 307);
}

export const config = { matcher: '/' };
