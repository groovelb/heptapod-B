import { handleOgRequest } from '../../../src/lib/og/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handleOgRequest;
export const HEAD = handleOgRequest;
