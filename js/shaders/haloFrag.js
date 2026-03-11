export const haloFrag = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPos;
  uniform float time;

  void main() {
    // Rayon normalisé dans le ring (0 = bord interne, 1 = bord externe)
    float r = length(vPos.xy);
    float rNorm = (r - 2.0) / 0.6; // 0 → 1

    // Fondu sur les deux bords du ring → anneau lumineux fin
    float band = smoothstep(0.0, 0.3, rNorm) * smoothstep(1.0, 0.7, rNorm);

    // Angle pour l'animation de flux orbital
    float angle = atan(vPos.y, vPos.x);
    float flow = sin(angle * 10.0 - time * 4.0) * 0.5 + 0.5;

    // Couleur blanc chaud
    vec3 color = mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 1.0, 1.0), flow);

    float alpha = band * (0.7 + 0.3 * flow);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;
