import * as THREE from "three";
import { diskVert } from "./shaders/diskVert.js";
import { diskFrag } from "./shaders/diskFrag.js";
import { haloVert } from "./shaders/haloVert.js";
import { haloFrag } from "./shaders/haloFrag.js";

var blackHole, halo, haloShader, accretionDisk, diskShader;

export function createBlackHole(scene) {
  // Horizon des événements
  var bhGeometry = new THREE.SphereGeometry(2, 64, 64);
  var bhMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  blackHole = new THREE.Mesh(bhGeometry, bhMaterial);
  scene.add(blackHole);

  // Photonsphère : tore fin à l'équateur

  haloShader = new THREE.ShaderMaterial({
    vertexShader: haloVert,
    fragmentShader: haloFrag,
    uniforms: { time: { value: 0.0 } },
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Ring très fin, vertical, qui simule la photonsphère vue de côté
  halo = new THREE.Mesh(new THREE.RingGeometry(1.8, 3.4, 128), haloShader);
  // Pas de rotation : le ring est déjà vertical (dans le plan XY)
  scene.add(halo);

  // Disque d'accrétion
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
  scene.add(accretionDisk);
}

export function updateBlackHole(deltaTime, camera) {
  accretionDisk.rotation.y -= deltaTime * 1.0;
  diskShader.uniforms.time.value += deltaTime;
  haloShader.uniforms.time.value += deltaTime;

  if (camera) {
    halo.quaternion.copy(camera.quaternion);
  }
}
