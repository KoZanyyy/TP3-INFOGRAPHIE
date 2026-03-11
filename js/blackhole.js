/**
 * @fileoverview Gestion du système de trou noir.
 * Encapsule l'horizon des événements, le disque d'accrétion (procédural)
 * et le halo (simulation de photonsphère par lentille gravitationnelle).
 */

import * as THREE from "three";
import { diskVert } from "./shaders/diskVert.js";
import { diskFrag } from "./shaders/diskFrag.js";
import { haloVert } from "./shaders/haloVert.js";
import { haloFrag } from "./shaders/haloFrag.js";

var blackHoleGroup, blackHole, halo, haloShader, accretionDisk, diskShader;

/**
 * Paramètres dynamiques du trou noir.
 * @type {Object}
 * @property {number} currentScale - Échelle actuelle (interpolée)
 * @property {number} targetScale - Échelle cible (augmente à chaque absorption)
 */
export var bhParams = {
  currentScale: 1.0,
  targetScale: 1.0,
};

/**
 * Crée et assemble toutes les composantes géométriques et matérielles
 * du trou noir, et les ajoute à la scène au sein d'un groupe unifié.
 *
 * @param {THREE.Scene} scene - La scène Three.js principale
 */
export function createBlackHole(scene) {
  blackHoleGroup = new THREE.Group();
  scene.add(blackHoleGroup);

  var bhGeometry = new THREE.SphereGeometry(2, 64, 64);
  var bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHole = new THREE.Mesh(bhGeometry, bhMaterial);
  blackHoleGroup.add(blackHole);

  haloShader = new THREE.ShaderMaterial({
    vertexShader: haloVert,
    fragmentShader: haloFrag,
    uniforms: { time: { value: 0.0 } },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  halo = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), haloShader);
  blackHoleGroup.add(halo);

  var diskGeom = new THREE.RingGeometry(2.5, 8, 128);
  diskGeom.rotateX(-Math.PI / 2);
  diskShader = new THREE.ShaderMaterial({
    vertexShader: diskVert,
    fragmentShader: diskFrag,
    uniforms: { time: { value: 0.0 } },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  accretionDisk = new THREE.Mesh(diskGeom, diskShader);
  blackHoleGroup.add(accretionDisk);
}

/**
 * Met à jour les animations du système de trou noir à chaque frame.
 * Gère la rotation du disque, l'avancée du temps dans les shaders GLSL,
 * l'orientation du billboard du halo et l'interpolation de croissance.
 *
 * @param {number} deltaTime - Temps écoulé depuis la dernière frame (en secondes)
 * @param {THREE.Camera} camera - La caméra active (nécessaire pour le billboard)
 */
export function updateBlackHole(deltaTime, camera) {
  accretionDisk.rotation.y -= deltaTime * 1.0;
  diskShader.uniforms.time.value += deltaTime;
  haloShader.uniforms.time.value += deltaTime;

  if (camera) {
    halo.quaternion.copy(camera.quaternion);
  }

  bhParams.currentScale +=
    (bhParams.targetScale - bhParams.currentScale) * deltaTime * 2.0;
  blackHoleGroup.scale.set(
    bhParams.currentScale,
    bhParams.currentScale,
    bhParams.currentScale,
  );
}
