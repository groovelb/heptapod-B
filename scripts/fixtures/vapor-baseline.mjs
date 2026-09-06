/**
 * Frozen test oracle copied unchanged from commit 9a24f3e:
 * src/utils/heptapod/logogramParticles.js, noiseHash and paintVapor bodies.
 * Do not import production drawing code here or update alongside optimizations.
 * Kept in-tree so shallow clones and exported source copies need no Git history.
 */
function noiseHash(ix, iy) {
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function paintVapor(vctx, puffs, t, puffSprite) {
  for (let i = 0; i < puffs.length; i += 1) {
    const p = puffs[i];
    let age;
    if (p.cycle > 0) {
      if (t < p.birth) continue;
      age = (t - p.birth) % p.cycle;
    } else {
      age = t - p.birth;
    }
    if (age < 0 || age > p.life) continue;
    const u = age / p.life;
    const fade = Math.sin(Math.PI * u); // cosine 생명주기 (0→peak→0)
    const scale = p.r0 * (1 + p.growth * u);
    // 드리프트 + 해시 노이즈 흔들림 (결정론 — 시간의 순수 함수)
    const nx = noiseHash(i * 7 + 1, Math.floor(age * 0.01)) - 0.5;
    const wob = Math.sin(age * p.wFreq + p.wPh) * p.wAmp * (0.5 + u);
    const x = p.x0 + Math.cos(p.driftAng) * p.driftSpd * age + wob * 0.6 + nx * 2;
    const y = p.y0 + Math.sin(p.driftAng) * p.driftSpd * age + Math.cos(age * p.wFreq * 0.8 + p.wPh) * p.wAmp * 0.4;
    const rot = p.rot0 + p.rotSpd * age;
    vctx.globalAlpha = p.baseA * fade;
    vctx.translate(x, y);
    vctx.rotate(rot);
    vctx.drawImage(puffSprite, -scale, -scale, scale * 2, scale * 2);
    vctx.rotate(-rot);
    vctx.translate(-x, -y);
  }
  vctx.globalAlpha = 1;
}
