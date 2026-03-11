export const haloFrag = /* glsl */ `
  varying vec2 vUv;
  uniform float time;

  void main() {
    // Recentrer UV de [0, 1] à [-1, 1]
    vec2 p = vUv * 2.0 - 1.0;
    
    // Déformation en sablier :
    // Plus on est proche de y=0 (le disque), plus x est "compressé", 
    float flare = exp(-abs(p.y) * 3.5) * 0.45;
    
    // Rayon virtuel courbé
    float r = length(vec2(p.x * (1.0 - flare), p.y));

    // L'arc lumineux : un anneau fin 
    // r - 0.55 définit la position de l'arc
    float arc = abs(r - 0.55);
    
    // Épaisseur de l'arc (plus y est proche de 0, plus l'arc s'épaissit et se fond dans le disque)
    float thickness = mix(0.05, 0.18, exp(-abs(p.y) * 4.0));
    float intensity = smoothstep(thickness, 0.0, arc);

    // Ajouter l'effet de "chute" : des stries qui descendent vers y=0
    float angle = atan(p.y, p.x);
    // On utilise abs(p.y) dans le temps pour que ça tombe vers le centre (depuis le haut ET depuis le bas)
    float fall = sin(angle * 8.0 - time * 5.0 * sign(p.y)) * 0.5 + 0.5;
    
    // Masque pour cacher l'intérieur du trou noir (r < 0.48)
    float holeMask = smoothstep(0.48, 0.52, r);
    
    // On atténue fortement sur les côtés 
    float sideFade = smoothstep(1.0, 0.2, abs(p.x));

    float finalIntensity = intensity * (0.6 + 0.4 * fall) * holeMask * sideFade;


    vec3 coreColor = vec3(1.0, 0.95, 0.8);
    vec3 edgeColor = vec3(1.0, 0.6, 0.1);  
    
    // Plus on est proche du disque (y=0), plus on prend la couleur du disque
    vec3 color = mix(coreColor, edgeColor, exp(-abs(p.y) * 2.0));
    
    color *= 1.5;

    float alpha = finalIntensity;

    gl_FragColor = vec4(color, alpha);
  }
`;
