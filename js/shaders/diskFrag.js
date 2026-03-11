export const diskFrag = /* glsl */ `
  uniform float time;
  varying vec3 vPos;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.1;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    float dist = length(vPos.xz);
    float angle = atan(vPos.z, vPos.x);

    float r = (dist - 2.5) / 5.5;

    vec2 uv  = vec2(angle / 6.2831 + time * 0.12, r * 3.0);
    float f  = fbm(uv * vec2(8.0, 2.0)) * 0.5 + 0.5;

    vec2 uv2 = vec2(angle / 6.2831 + time * 0.07, r * 4.0 + 1.5);
    float f2 = fbm(uv2 * vec2(12.0, 1.5)) * 0.5 + 0.5;

    float density = mix(f, f2, 0.4);

    // MODIFIÉ : palette plus jaune/dorée
    vec3 coreColor  = vec3(1.0,  0.95, 0.6);   // jaune vif quasi blanc
    vec3 midColor   = vec3(1.0,  0.75, 0.1);   // jaune-orange saturé
    vec3 outerColor = vec3(0.6,  0.2,  0.02);  // orange-brun foncé

    vec3 color = mix(coreColor,  midColor,   smoothstep(0.0, 0.45, r));
    color      = mix(color,      outerColor, smoothstep(0.45, 1.0, r));

    float brightness = pow(density, 1.4);
    color *= brightness * 1.6;

    float edgeFade = smoothstep(1.0, 0.75, r) * smoothstep(0.0, 0.12, r);
    float alpha = edgeFade * pow(density, 0.8) * 0.95;

    gl_FragColor = vec4(color, alpha);
  }
`;
