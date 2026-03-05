import * as THREE from 'three';

var renderer = null;
var solarScene = null;
var camera   = null;
var earth     = null;
var moon     = null;
var solar     = null;
var solarSysGroup = null;
var solarGroup = null;
var earthSysGroup = null;
var earthGroup = null;
var moonSysGroup = null;
var moonGroup = null;
var curTime  = Date.now();

init();
run();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild(renderer.domElement);

    solarScene = new THREE.Scene();

    // Caméra reculée pour tout voir
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 5, 30);
    camera.lookAt(0, 0, 0);

    // Lumières
    var sunLight = new THREE.PointLight(0xffff88, 200, 200);  // couleur jaune, intensité 5, distance 30
    sunLight.position.set(0, 0, 0);
    solarScene.add(sunLight);


    // Texture Terre
    var earthTexture = new THREE.TextureLoader().load("images/earth_atmos_2048.jpg");

    // Terre
    var earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
    var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.set(0, 0, 0);
    earth.rotation.x = Math.PI / 5;

    // Texture Lune
    var moonTexture = new THREE.TextureLoader().load("images/moon_1024.jpg");

    // Lune
    var moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture });
    var moonGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(0, 0, 0);

    // Soleil
    var solarMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        emissive: 0x444400,
        specular: 0xffffff,
        shininess: 200
    });
    var solarGeometry = new THREE.SphereGeometry(2, 32, 32);
    solar = new THREE.Mesh(solarGeometry, solarMaterial);
    solar.position.set(0, 0, 0);

    // Groupes hiérarchiques
    solarSysGroup = new THREE.Group();
    solarGroup = new THREE.Group();
    earthSysGroup = new THREE.Group();
    earthGroup = new THREE.Group();
    moonSysGroup = new THREE.Group();
    moonGroup = new THREE.Group();

    // Hiérarchie
    solarGroup.add(solarSysGroup);
    solarSysGroup.add(solar);

    solarSysGroup.add(earthGroup);
    earthGroup.position.set(12, 0, 0); // Distance Soleil-Terre

    earthGroup.add(earthSysGroup);
    earthSysGroup.add(earth);

    earthSysGroup.add(moonGroup);
    moonGroup.position.set(3, 0, 0); // Distance Terre-Lune

    moonGroup.add(moonSysGroup);
    moonSysGroup.add(moon);

    solarScene.add(solarSysGroup);
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
    var now       = Date.now();
    var deltaTime = now - curTime;
    curTime       = now;
    var fracTime  = deltaTime / 1000;
    var angle = fracTime * Math.PI * 2;

    // Accélère la rotation Terre-Soleil : 1 an = 1 minute
    earthGroup.rotation.y += angle * 60 / 365;  // 60x plus rapide
    solarSysGroup.rotation.y += angle * 60 / 365;  // 60x plus rapide
    earth.rotation.y      += angle;             // Terre sur elle-même (inchangé)
    moonGroup.rotation.y  += angle / 28 * 12;   // Lune : 12x plus rapide (cohérent)
    moon.rotation.y       += angle / 28 * 12;   // Lune synchrone
}

