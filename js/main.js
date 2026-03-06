import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

var renderer, solarScene, camera, controls;
var blackHole, accretionDisk, diskShader, halo;
var planets = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var mouseWorldPos = new THREE.Vector3();
var curTime = Date.now();

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

  // Halo autour du trou noir (glow simple)
  var haloGeom = new THREE.SphereGeometry(2.4, 64, 64);
  var haloMat = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  halo = new THREE.Mesh(haloGeom, haloMat);
  solarScene.add(halo);

  // Disque d'accrétion (anneau + shader)
  var diskGeom = new THREE.RingGeometry(2.5, 8, 64);
  diskGeom.rotateX(-Math.PI / 2); // horizontal

  diskShader = new THREE.ShaderMaterial({
    vertexShader: document.querySelector("#disk-vert").textContent.trim(),
    fragmentShader: document.querySelector("#disk-frag").textContent.trim(),
    uniforms: { time: { value: 0.0 } },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  accretionDisk = new THREE.Mesh(diskGeom, diskShader);
  solarScene.add(accretionDisk);

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
}

function run() {
  requestAnimationFrame(run);
  render();
  animate();
}

function render() {
  renderer.render(solarScene, camera);
}

function animate() {
  controls.update();

  var now = Date.now();
  var deltaTime = (now - curTime) / 1000;
  curTime = now;

  // Animation disque + halo
  diskShader.uniforms.time.value += deltaTime;
  const baseScale = 1.0 + 0.05 * Math.sin(curTime * 0.002);
  halo.scale.set(baseScale, baseScale, baseScale);

  // Projection de la souris sur le plan Y=0
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

    // Bordures (rebond simple)
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
