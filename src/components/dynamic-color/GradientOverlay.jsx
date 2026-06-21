import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

/** GLSL vertex shader — UV 좌표 전달 */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/** GLSL fragment shader — Simplex Noise 그라데이션 + 필름 그레인 */
const fragmentShader = `
  uniform float uTime;
  uniform float uScrollIn;
  uniform float uScrollOut;
  uniform vec2 uResolution;
  uniform vec3 uColorLight;
  uniform vec3 uColorDark;
  uniform float uGrainIntensity;

  varying vec2 vUv;

  // Simplex Noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Film Grain
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    float wave = snoise(vec2(vUv.x * 0.8, uTime * 0.25)) * 0.04;
    float distortedY = vUv.y + wave;

    // Phase 1: 어두운색이 아래에서 올라옴
    float progressIn = uScrollIn * 1.2 + 0.15;
    float maskIn = smoothstep(progressIn - 0.2, progressIn + 0.2, distortedY);
    float darkFromIn = 1.0 - maskIn;

    // Outro: 밝은색이 아래에서 올라옴, 상단 엣지는 어둡게 유지
    float topEdge = smoothstep(0.85, 1.0, distortedY);
    float lightReach = uScrollOut * 0.85;
    float isLight = smoothstep(lightReach + 0.15, lightReach - 0.15, distortedY);
    float outroDark = 1.0 - isLight * (1.0 - topEdge);

    float darkAmount = darkFromIn * (1.0 - uScrollOut + uScrollOut * outroDark);

    vec3 color = mix(uColorLight, uColorDark, darkAmount);

    // 필름 그레인
    float grain = random(vUv * uResolution + uTime) * uGrainIntensity;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Hex 색상을 0-1 범위 RGB 배열로 변환
 * @param {string} hex - '#RRGGBB' 형식 hex 색상
 * @returns {number[]} [r, g, b] (0-1 범위)
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0, 0, 0];
}

/**
 * GradientOverlay 컴포넌트
 *
 * Three.js WebGL 기반 스크롤 반응형 그라데이션 배경 오버레이.
 * Simplex Noise로 경계면이 유기적으로 일렁이며, 스크롤에 따라 색상이 전환된다.
 *
 * 동작 흐름:
 * 1. 전체 화면을 덮는 WebGL 캔버스가 생성된다
 * 2. 스크롤하면 어두운색이 아래에서 위로 올라오며 밝은색을 덮는다
 * 3. scrollOutRef 요소가 뷰포트에 진입하면 밝은색이 다시 올라온다
 * 4. 경계면은 Simplex Noise로 시간에 따라 물결치듯 변형된다
 * 5. 필름 그레인 텍스처가 전체 위에 오버레이된다
 *
 * Props:
 * @param {string} colorLight - 밝은 영역 hex 색상 [Optional, 기본값: theme.palette.grey[200]]
 * @param {string} colorDark - 어두운 영역 hex 색상 [Optional, 기본값: theme.palette.secondary.main]
 * @param {object} scrollOutRef - outro 구간 기준 요소의 React ref [Optional]
 * @param {boolean} isGrain - 필름 그레인 효과 여부 [Optional, 기본값: true]
 * @param {number} grainIntensity - 필름 그레인 강도 (0~0.1) [Optional, 기본값: 0.035]
 * @param {object} sx - MUI sx 스타일 [Optional]
 *
 * Example usage:
 * <GradientOverlay />
 * <GradientOverlay colorLight="#f5f5f5" colorDark="#263238" scrollOutRef={outroRef} />
 */
function GradientOverlay({
  colorLight,
  colorDark,
  scrollOutRef,
  isGrain = true,
  grainIntensity = 0.035,
  sx = {},
}) {
  const theme = useTheme();
  const containerRef = useRef(null);
  const animationIdRef = useRef(0);

  /** 테마 기반 기본 색상 해석 */
  const resolvedLight = colorLight || theme.palette.grey[200];
  const resolvedDark = colorDark || theme.palette.secondary.main;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    /** Three.js 씬 초기화 */
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    /** 색상 변환 및 uniform 설정 */
    const rgbLight = hexToRgb(resolvedLight);
    const rgbDark = hexToRgb(resolvedDark);

    const uniforms = {
      uTime: { value: 0 },
      uScrollIn: { value: 0 },
      uScrollOut: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uColorLight: { value: new THREE.Color(...rgbLight) },
      uColorDark: { value: new THREE.Color(...rgbDark) },
      uGrainIntensity: { value: isGrain ? grainIntensity : 0 },
    };

    /** 셰이더 머티리얼 생성 */
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    /** 스크롤 진행률 추적 (lerp 보간) */
    let targetScrollIn = 0;
    let targetScrollOut = 0;
    let currentScrollIn = 0;
    let currentScrollOut = 0;

    const updateScrollTarget = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      targetScrollIn = Math.min(scrollY / windowHeight, 1);

      if (scrollOutRef?.current) {
        const outroRect = scrollOutRef.current.getBoundingClientRect();
        const outroProgress = (windowHeight - outroRect.top) / windowHeight;
        targetScrollOut = Math.max(0, Math.min(1, outroProgress));
      }
    };

    /** 리사이즈 대응 */
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    window.addEventListener('resize', handleResize);

    /** 렌더 루프 */
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      currentScrollIn += (targetScrollIn - currentScrollIn) * 0.06;
      currentScrollOut += (targetScrollOut - currentScrollOut) * 0.06;

      uniforms.uTime.value = elapsedTime;
      uniforms.uScrollIn.value = currentScrollIn;
      uniforms.uScrollOut.value = currentScrollOut;

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    /** 리소스 정리 */
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('scroll', updateScrollTarget);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [resolvedLight, resolvedDark, scrollOutRef, isGrain, grainIntensity]);

  return (
    <Box
      ref={ containerRef }
      sx={ {
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        ...sx,
      } }
    />
  );
}

export default GradientOverlay;
