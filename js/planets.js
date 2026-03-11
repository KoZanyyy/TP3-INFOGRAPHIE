import * as THREE from "three";
import { bhParams } from "./blackhole.js"; // Import pour pouvoir le modifier

var planets = [];

var texturePaths = [
  "images/earth_atmos_2048.jpg",
  "images/moon_1024.jpg",
  "images/earth_specular_2048.jpg",
];

export function createPlanets(scene) {
  for (let i = 0; i < 3; i++) {
    var texture = new THREE.TextureLoader().load(texturePaths[i]);
    let mat = new THREE.MeshPhongMaterial({ map: texture });
    let p = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 32), mat);

    let angle = Math.random() * Math.PI * 2;
    let dist = 15 + Math.random() * 10;
    p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

    p.userData = {
      velocity: new THREE.Vector3(
        -Math.sin(angle),
        0,
        Math.cos(angle),
      ).multiplyScalar(0.15),
      spaghettifying: false,
      eaten: false,
    };

    planets.push(p);
    scene.add(p);
  }
}

export function updatePlanets(deltaTime, mouseWorldPos) {
  // Le rayon effectif d'attraction dépend de l'échelle du trou noir
  let eventHorizonRadius = 2.5 * bhParams.currentScale;

  planets.forEach((p) => {
    if (p.userData.eaten) return;

    if (p.userData.spaghettifying) {
      p.lookAt(0, 0, 0);
      p.scale.z += deltaTime * 3.0;
      p.scale.x = Math.max(0.1, p.scale.x - deltaTime);
      p.scale.y = Math.max(0.1, p.scale.y - deltaTime);

      p.position.lerp(new THREE.Vector3(0, 0, 0), 0.08);
      p.material.opacity = Math.max(0, p.material.opacity - deltaTime);

      // Si la planète est arrivée au centre, elle est mangée !
      if (p.position.length() < 1.0 * bhParams.currentScale) {
        // Le trou noir grossit de 15% à chaque repas
        bhParams.targetScale += 0.15;
        respawnPlanet(p);
      }
      return;
    }

    let distToCenter = p.position.length();
    let dirToCenter = p.position.clone().negate().normalize();

    // La gravité s'adapte à la taille (masse) du trou noir
    let gravityForce =
      (0.8 * bhParams.currentScale) / (distToCenter * distToCenter);
    p.userData.velocity.add(dirToCenter.multiplyScalar(gravityForce));

    if (mouseWorldPos) {
      let distToMouse = p.position.distanceTo(mouseWorldPos);
      if (distToMouse < 6.0) {
        let dirFromMouse = p.position.clone().sub(mouseWorldPos).normalize();
        let pushForce = 0.06 / Math.max(distToMouse, 0.5);
        p.userData.velocity.add(dirFromMouse.multiplyScalar(pushForce));
      }
    }

    p.position.add(p.userData.velocity);

    const LIMIT = 40; // Légèrement augmenté pour laisser de la place
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

    // Déclenchement de la spaghettification adapté à la taille du trou noir
    if (distToCenter < eventHorizonRadius) {
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
  // Fait respawn la planète plus loin si le trou noir est devenu gros
  let baseDist = 15 * Math.max(1.0, bhParams.targetScale * 0.8);
  let dist = baseDist + Math.random() * 10;

  p.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
  p.userData.velocity
    .set(-Math.sin(angle), 0, Math.cos(angle))
    .multiplyScalar(0.15);
}
