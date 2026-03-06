import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

var renderer, solarScene, camera, controls;
var blackHole, accretionDisk, diskShader;
var planets = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
// Un plan mathématique horizontal (Y=0) pour détecter où pointe la souris
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

  // Caméra positionnée pour bien voir le plan de rotation
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

  // Background MilkyWay (inchangé)
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

  // --- LE TROU NOIR ---
  // 1. Horizon des événements (Sphère purement noire)
  var bhGeometry = new THREE.SphereGeometry(2, 64, 64);
  var bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHole = new THREE.Mesh(bhGeometry, bhMaterial);
  solarScene.add(blackHole);

  // 2. Disque d'accrétion (Géométrie d'anneau + Shader)
  var diskGeom = new THREE.RingGeometry(2.5, 8, 64);
  diskGeom.rotateX(-Math.PI / 2); // Le mettre à l'horizontal

  diskShader = new THREE.ShaderMaterial({
    vertexShader: document.querySelector("#disk-vert").textContent.trim(),
    fragmentShader: document.querySelector("#disk-frag").textContent.trim(),
    uniforms: { time: { value: 0.0 } },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false, // Important pour que l'anneau ne masque pas le fond
  });
  accretionDisk = new THREE.Mesh(diskGeom, diskShader);
  solarScene.add(accretionDisk);

  // --- LES PLANÈTES ---
  // Génération de 3 planètes avec vélocité
  var textures = ["images/earth_atmos_2048.jpg", "images/moon_1024.jpg", "images/earth_specular_2048.jpg"];
  for (let i = 0; i < 3; i++) {
      var texture = new THREE.TextureLoader().load(textures[i]);
    let mat = new THREE.MeshPhongMaterial({ map : texture  });
    let p = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), mat);

    let angle = Math.random() * Math.PI * 2;
    let dist = 12 + Math.random() * 8; // Distance initiale
    p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

    // On donne une vitesse tangentielle pour qu'elles orbitent
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

  // --- LISTENER SOURIS ---
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

  // Mise à jour du shader du disque
  diskShader.uniforms.time.value += deltaTime;

  // Projection de la souris sur le plan 3D
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, mouseWorldPos);

  planets.forEach((p) => {
    if (p.userData.eaten) return;

    // 1. ANIMATION DE SPAGHETTIFICATION (Le trou noir la mange)
    if (p.userData.spaghettifying) {
      p.lookAt(0, 0, 0); // On aligne l'axe Z local de la planète vers le centre
      p.scale.z += deltaTime * 3.0; // Étirement violent
      p.scale.x = Math.max(0.1, p.scale.x - deltaTime); // Écrasement
      p.scale.y = Math.max(0.1, p.scale.y - deltaTime);

      p.position.lerp(new THREE.Vector3(0, 0, 0), 0.08); // Aspiration
      p.material.opacity = Math.max(0, p.material.opacity - deltaTime);

      // Si elle est engloutie, on la supprime
      if (p.position.length() < 1.0) {
        p.userData.eaten = true;
        solarScene.remove(p);
      }
      return; // On arrête la physique normale
    }

    // 2. PHYSIQUE ORBITALE ET INTERACTION SOURIS
    let distToCenter = p.position.length();
    let dirToCenter = p.position.clone().negate().normalize();

    // Force de gravité (attire vers 0,0,0)
    let gravity = 0.8 / (distToCenter * distToCenter);
    p.userData.velocity.add(dirToCenter.multiplyScalar(gravity));

    // Répulsion de la souris (Force poussée par le joueur)
    if (mouseWorldPos) {
      let distToMouse = p.position.distanceTo(mouseWorldPos);
      if (distToMouse < 6.0) {
        // Si la souris est proche
        let dirFromMouse = p.position.clone().sub(mouseWorldPos).normalize();
        let pushForce = 0.06 / Math.max(distToMouse, 0.5);
        p.userData.velocity.add(dirFromMouse.multiplyScalar(pushForce));
      }
    }

    p.position.add(p.userData.velocity);

    // Détection de l'horizon des événements
    if (distToCenter < 2.5) {
      p.userData.spaghettifying = true;
      p.material.transparent = true;
    }
  });
}
