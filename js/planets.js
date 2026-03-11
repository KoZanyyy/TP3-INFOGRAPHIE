import * as THREE from "three";

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
    scene.add(p);
  }
}

export function updatePlanets(deltaTime, mouseWorldPos) {
  planets.forEach((p) => {
    if (p.userData.eaten) return;

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

    let distToCenter = p.position.length();
    let dirToCenter = p.position.clone().negate().normalize();

    let gravity = 0.8 / (distToCenter * distToCenter);
    p.userData.velocity.add(dirToCenter.multiplyScalar(gravity));

    if (mouseWorldPos) {
      let distToMouse = p.position.distanceTo(mouseWorldPos);
      if (distToMouse < 6.0) {
        let dirFromMouse = p.position.clone().sub(mouseWorldPos).normalize();
        let pushForce = 0.06 / Math.max(distToMouse, 0.5);
        p.userData.velocity.add(dirFromMouse.multiplyScalar(pushForce));
      }
    }

    p.position.add(p.userData.velocity);

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
