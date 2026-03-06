import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

var renderer = null;
var solarScene = null;
var camera   = null;
var earth     = null;
var moon     = null;
var sun     = null;
var sunSysGroup = null;
var earthSysGroup = null;
var earthGroup = null;
var moonSysGroup = null;
var moonGroup = null;
var cameraAngle = 0;
var controls = null;
var shader;
var uniforms;
var curTime  = Date.now();

init();
run();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    document.body.appendChild(renderer.domElement);

    solarScene = new THREE.Scene();

    // Caméra reculée pour tout voir
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.set(0, 5, 30);
    camera.lookAt(0, 0, 0);

    // Controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping      = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor      = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance        = 1;
    controls.maxDistance        = 10;
    controls.maxPolarAngle      = Math.PI / 2;

    // Background
    var path = "images/MilkyWay/";
    var format = '.jpg';
    var urls = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];

    var textureCube    = new THREE.CubeTextureLoader().load( urls );
    textureCube.type   = THREE.UnsignedByteType;
    textureCube.format = THREE.RGBAFormat;
    solarScene.background   = textureCube;

    // Lumières
    var sunLight = new THREE.PointLight(0xffff88, 200, 200);  // couleur jaune, intensité 5, distance 30
    sunLight.position.set(0, 0, 0);
    solarScene.add(sunLight);

    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width  = 512; // default
    sunLight.shadow.mapSize.height = 512; // default
    sunLight.shadow.camera.near    = 0.5; // default
    sunLight.shadow.camera.far     = 50;

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
    var sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        emissive: 0x444400,
        specular: 0xffffff,
        shininess: 200
    });
    var sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 0, 0);

    // Groupes hiérarchiques
    sunSysGroup = new THREE.Group();
    earthSysGroup = new THREE.Group();
    earthGroup = new THREE.Group();
    moonSysGroup = new THREE.Group();
    moonGroup = new THREE.Group();

    // Hiérarchie
    sunSysGroup.add(sun);

    sunSysGroup.add(earthGroup);
    earthGroup.position.set(12, 0, 0); // Distance Soleil-Terre

    earthGroup.add(earthSysGroup);
    earthSysGroup.add(earth);

    earthSysGroup.add(moonGroup);
    moonGroup.position.set(3, 0, 0); // Distance Terre-Lune

    moonGroup.add(moonSysGroup);
    moonSysGroup.add(moon);



    sun.castShadow      = false;
    sun.receiveShadow   = false;
    earth.castShadow    = true;
    earth.receiveShadow = true;
    moon.castShadow     = true;
    moon.receiveShadow  = true;

    controls.target.set(12, 0, 0);

    uniforms = {
        moment: { value: 0.0 },
        scale:  { value: 0.02 }
    };
    shader = new THREE.ShaderMaterial( {
        vertexShader: document.querySelector( '#post-vert' ).textContent.trim(),
        fragmentShader: document.querySelector( '#post-frag' ).textContent.trim(),
        uniforms: uniforms
    } );
    shader.glslVersion = THREE.GLSL3;
    var sunHalo  = new THREE.Mesh( sunGeometry, shader );
    sunHalo.castShadow = false;
    sunHalo.receiveShadow = false;
    sunSysGroup.add( sunHalo );

    solarScene.add(sunSysGroup);

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

    var now       = Date.now();
    var deltaTime = now - curTime;
    curTime       = now;
    var fracTime  = deltaTime / 1000;
    var angle = fracTime * Math.PI * 2;

    // Tes rotations système solaire (inchangées)
    earthGroup.rotation.y += angle * 60 / 365;
    sunSysGroup.rotation.y += angle * 60 / 365;
    earth.rotation.y      += angle;
    moonGroup.rotation.y  += angle / 28 * 12;
    moon.rotation.y       += angle / 28 * 12;

    shader.uniforms.moment.value += fracTime;
}


