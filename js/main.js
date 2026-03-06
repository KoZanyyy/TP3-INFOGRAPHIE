import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

var renderer, solarScene, camera, controls;
var blackHole, accretionDisk, diskShader, halo;
var planets = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var mouseWorldPos = new THREE.Vector3();
var curTime = Date.now();

// post-process
var composer, lensingPass;

// --- SHADER DE LENTILLE (post-process) ---
const lensingShader = {
  uniforms: {
    tDiffuse: { value: null },
    blackHoleScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
    lensingStrength: { value: 0.18 },
    lensingRadius: { value: 0.35 },
    aspectRatio: { value: window.innerWidth / window.innerHeight },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 blackHoleScreenPos;
    uniform float lensingStrength;
    uniform float lensingRadius;
    uniform float aspectRatio;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec2 toCenter = uv - blackHoleScreenPos;
      toCenter.x *= aspectRatio;

      float dist = length(toCenter);

      if (dist < lensingRadius) {
        float distortionAmount = lensingStrength / (dist * dist + 0.003);
        distortionAmount = clamp(distortionAmount, 0.0, 0.7);

        float falloff = smoothstep(lensingRadius, lensingRadius * 0.3, dist);
        distortionAmount *= falloff;

        vec2 offset = normalize(toCenter) * distortionAmount;
        offset.x /= aspectRatio;

        uv -= offset;
      }

      vec4 color = texture2D(tDiffuse, uv);
      gl_FragColor = color;
    }
  `,
};

init();
run();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  solarScene = new THREE.Scene();

  // Caméra
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000,
  );
  camera.position.set(0, 15, 35);
  camera.lookAt(0, 0, 0);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;

  // Background MilkyWay
  var path = "images/MilkyWay/";
  var format = ".jpg";
  var urls = [
    path + "posx" + format,
    path + "negx" + format,
    path + "posy" + format,
    path + "negy" + format,
    path + "posz" + format,
    path + "negz" + format,
  ];
  var textureCube = new THREE.CubeTextureLoader().load(urls);
  solarScene.background = textureCube;

  var ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  solarScene.add(ambientLight);

  // --- TROU NOIR ---
  // Horizon des événements
  var bhGeometry = new THREE.SphereGeometry(2, 64, 64);
  var bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHole = new THREE.Mesh(bhGeometry, bhMaterial);
  solarScene.add(blackHole);

  // Disque d'accrétion (RingGeometry + shader)
  var diskGeom = new THREE.RingGeometry(2.5, 8, 64);
  diskGeom.rotateX(-Math.PI / 2);

  diskShader = new THREE.ShaderMaterial({
    vertexShader: document.querySelector("#disk-vert").textContent.trim(),
    fragmentShader: document.querySelector("#disk-frag").textContent.trim(),
    uniforms: {
      time: { value: 0.0 },
      baseColorInner: { value: new THREE.Color(0xffcc66) },
      baseColorOuter: { value: new THREE.Color(0xff5500) },
    },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  accretionDisk = new THREE.Mesh(diskGeom, diskShader);
  solarScene.add(accretionDisk);

  // Halo même teinte que le disque (glow)
  var haloGeom = new THREE.SphereGeometry(2.4, 64, 64);
  const haloColor = diskShader.uniforms.baseColorInner.value.clone();
  var haloMat = new THREE.MeshBasicMaterial({
    color: haloColor,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  halo = new THREE.Mesh(haloGeom, haloMat);
  solarScene.add(halo);

  // --- PLANÈTES ---
  var textures = [
    "images/earth_atmos_2048.jpg",
    "images/moon_1024.jpg",
    "images/earth_specular_2048.jpg",
  ];

  for (let i = 0; i < 3; i++) {
    var texture = new THREE.TextureLoader().load(textures[i]);
    let mat = new THREE.MeshPhongMaterial({ map: texture });
    let p = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), mat);

    let angle = Math.random() * Math.PI * 2;
    let dist = 12 + Math.random() * 8;
    p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

    p.userData = {
      velocity: new THREE.Vector3(
        -Math.sin(angle),
        0,
        Math.cos(angle),
      ).multiplyScalar(0.12),
      spaghettifying: false,
      eaten: false,
    };

    planets.push(p);
    solarScene.add(p);
  }

  // Souris
  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  // --- POST-PROCESS LENSING ---
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(solarScene, camera);
  composer.addPass(renderPass);

  lensingPass = new ShaderPass(lensingShader);
  composer.addPass(lensingPass);

  lensingPass.uniforms.aspectRatio.value =
    window.innerWidth / window.innerHeight;

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    lensingPass.uniforms.aspectRatio.value =
      window.innerWidth / window.innerHeight;
  });
}

function run() {
  requestAnimationFrame(run);
  render();
  animate();
}

function render() {
  composer.render();
}

function animate() {
  controls.update();

  var now = Date.now();
  var deltaTime = (now - curTime) / 1000;
  curTime = now;

  // Disque + halo
  diskShader.uniforms.time.value += deltaTime;
  const baseScale = 1.0 + 0.05 * Math.sin(curTime * 0.002);
  halo.scale.set(baseScale, baseScale, baseScale);

  // Position du trou noir en coordonnées écran pour le shader de lentille
  const bhScreenPos = blackHole.position.clone().project(camera);
  lensingPass.uniforms.blackHoleScreenPos.value.set(
    (bhScreenPos.x + 1) / 2,
    (bhScreenPos.y + 1) / 2,
  );

  // Projection de la souris sur le plan Y = 0
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, mouseWorldPos);

  planets.forEach((p) => {
    if (p.userData.eaten) return;

    // 1. Spaghettification
    if (p.userData.spaghettifying) {
      p.lookAt(0, 0, 0);
      p.scale.z += deltaTime * 3.0;
      p.scale.x = Math.max(0.1, p.scale.x - deltaTime);
      p.scale.y = Math.max(0.1, p.scale.y - deltaTime);

      p.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
      p.material.opacity = Math.max(0, p.material.opacity - deltaTime);

      if (p.position.length() < 1.0) {
        respawnPlanet(p);
      }
      return;
    }

    // 2. Physique + interaction souris
    let distToCenter = p.position.length();
    let dirToCenter = p.position.clone().negate().normalize();

    // Gravité
    let gravity = 0.8 / (distToCenter * distToCenter);
    p.userData.velocity.add(dirToCenter.multiplyScalar(gravity));

    // Poussée souris
    if (mouseWorldPos) {
      let distToMouse = p.position.distanceTo(mouseWorldPos);
      if (distToMouse < 6.0) {
        let dirFromMouse = p.position.clone().sub(mouseWorldPos).normalize();
        let pushForce = 0.06 / Math.max(distToMouse, 0.5);
        p.userData.velocity.add(dirFromMouse.multiplyScalar(pushForce));
      }
    }

    p.position.add(p.userData.velocity);

    // Bordures
    const LIMIT = 30;
    if (p.position.x > LIMIT) {
      p.position.x = LIMIT;
      p.userData.velocity.x *= -0.5;
    } else if (p.position.x < -LIMIT) {
      p.position.x = -LIMIT;
      p.userData.velocity.x *= -0.5;
    }

    if (p.position.z > LIMIT) {
      p.position.z = LIMIT;
      p.userData.velocity.z *= -0.5;
    } else if (p.position.z < -LIMIT) {
      p.position.z = -LIMIT;
      p.userData.velocity.z *= -0.5;
    }

    // Horizon des événements
    if (distToCenter < 2.5) {
      p.userData.spaghettifying = true;
      p.material.transparent = true;
    }
  });
}

function respawnPlanet(p) {
  p.scale.set(1, 1, 1);
  p.material.opacity = 1;
  p.material.transparent = false;
  p.userData.spaghettifying = false;
  p.userData.eaten = false;

  let angle = Math.random() * Math.PI * 2;
  let dist = 12 + Math.random() * 8;
  p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  p.userData.velocity
    .set(-Math.sin(angle), 0, Math.cos(angle))
    .multiplyScalar(0.12);
}
