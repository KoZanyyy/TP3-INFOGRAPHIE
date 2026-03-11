/**
 * @fileoverview Point d'entrée de l'application Three.js.
 * Gère l'initialisation de la scène, de la caméra, des contrôles,
 * et orchestre la boucle de rendu principale (Game Loop).
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createBlackHole, updateBlackHole } from "./blackhole.js";
import { createPlanets, updatePlanets } from "./planets.js";

var renderer, solarScene, camera, controls;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var mouseWorldPos = new THREE.Vector3();
var curTime = Date.now();

init();
run();

/**
 * Initialise le moteur de rendu WebGL, la scène spatiale,
 * la caméra, les contrôles orbitaux et les différents éléments 3D.
 * Configure également les écouteurs d'événements (souris, redimensionnement).
 */
function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  solarScene = new THREE.Scene();

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
  solarScene.background = new THREE.CubeTextureLoader().load(urls);

  solarScene.add(new THREE.AmbientLight(0xffffff, 0.8));

  createBlackHole(solarScene);
  createPlanets(solarScene);

  window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/**
 * Boucle d'animation principale (Game Loop).
 * Met à jour le temps, les contrôles de caméra, projette la position
 * de la souris en 3D, et délègue l'animation aux sous-systèmes.
 */
function run() {
  requestAnimationFrame(run);

  var now = Date.now();
  var deltaTime = (now - curTime) / 1000;
  curTime = now;

  controls.update();

  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(plane, mouseWorldPos);

  updateBlackHole(deltaTime, camera);
  updatePlanets(deltaTime, mouseWorldPos);

  renderer.render(solarScene, camera);
}
