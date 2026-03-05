import * as THREE from 'three';

var renderer = null;
var scene    = null;
var camera   = null;
var shape     = null;
var curTime  = Date.now();

init();
run();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 800 / 600, 1, 4000);

    //Texture WebGL
    //var mapUrl = "images/webgl-logo-256.jpg";

    //Texture Terre
    var mapUrl = "images/earth_atmos_2048.jpg";
    var map    = new THREE.TextureLoader().load(mapUrl);

    //Sphere
    var material = new THREE.MeshBasicMaterial({ map: map });
    var geometry = new THREE.SphereGeometry(1, 32, 32);

    //Cube
    //var material = new THREE.MeshBasicMaterial({ map: map });
    //var geometry = new THREE.BoxGeometry(2, 2, 2);


    shape = new THREE.Mesh(geometry, material);
    shape.position.z = -8;
    shape.rotation.x = Math.PI / 5;
    shape.rotation.y = Math.PI / 5;

    scene.add(shape);
}

function run() {
    requestAnimationFrame(run);
    render();
    animate();
}

function render() {
    renderer.render(scene, camera);
}

function animate() {
    var now       = Date.now();
    var deltaTime = now - curTime;
    curTime       = now;
    var fracTime  = deltaTime / 1000;

    var angle = 0.1 * Math.PI * 2 * fracTime;
    shape.rotation.y += angle;
}
