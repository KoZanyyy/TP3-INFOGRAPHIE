import * as THREE from "three";
import { diskVert } from "./shaders/diskVert.js";
import { diskFrag } from "./shaders/diskFrag.js";
import { haloVert } from "./shaders/haloVert.js";
import { haloFrag } from "./shaders/haloFrag.js";

var blackHoleGroup, blackHole, halo, haloShader, accretionDisk, diskShader;

// Variable d'échelle globale du trou noir
export var bhParams = {
  currentScale: 1.0,
  targetScale: 1.0,
};

export function createBlackHole(scene) {
  // On crée un groupe pour scaler tout en même temps
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

  halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), haloShader);
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

export function updateBlackHole(deltaTime, camera) {
  accretionDisk.rotation.y -= deltaTime * 1.0;
  diskShader.uniforms.time.value += deltaTime;
  haloShader.uniforms.time.value += deltaTime;

  if (camera) {
    halo.quaternion.copy(camera.quaternion);
  }

  // Interpolation fluide vers la nouvelle échelle
  bhParams.currentScale +=
    (bhParams.targetScale - bhParams.currentScale) * deltaTime * 2.0;
  blackHoleGroup.scale.set(
    bhParams.currentScale,
    bhParams.currentScale,
    bhParams.currentScale,
  );
}
