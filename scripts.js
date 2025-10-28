import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const organModels = {
  lung: 'models/lung2.glb',
  heart: 'models/heart.glb',
  heart2:'models/realistic_human_heart.glb',
  teeth: 'models/Mandibular_teeth_w_base_NIH3D.glb',
  brain: 'models/brain.glb',
  liver: 'models/liver3.glb',
  kidney1:'models/kidney.glb',
  kidney2:'models/kidney2.glb'
};

// Mock ML classifier: always "lung"
function mockClassify() {
  return 'liver';
}

// Handle file upload
document.getElementById('imageUpload').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('status').innerText = 'Detecting organ... ⏳';

  // Simulate ML processing delay
  setTimeout(() => {
    const predictedOrgan = mockClassify();
    document.getElementById('status').innerText = `Predicted organ: ${predictedOrgan}`;

    // Show 3D viewer
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('viewer-section').style.display = 'block';
    document.getElementById('model-name').innerText = predictedOrgan.toUpperCase();

    load3DModel(organModels[predictedOrgan]);
  }, 1000);
});

// Three.js 3D Model Loader
function load3DModel(modelPath) {
  // 🎨 Renderer
  const canvas = document.getElementById('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x1a1a1a, 1);

  // 🌌 Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // 📷 Camera — set a small near plane so zooming very close doesn't clip
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.clientWidth / canvas.clientHeight,
    0.01,   // lowered near plane
    1000
  );
  camera.position.set(0, 0, 4);
  // 🖱️ Orbit Controls

    // 🖱️ Orbit Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;

    // 🌀 Allow full 360° rotation
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    // Set some sensible defaults (will be adjusted once model loads)
    controls.minDistance = 0.3;
    controls.maxDistance = 20;
    controls.zoomSpeed = 1.0;
    controls.rotateSpeed = 0.8;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;

    // 💡 Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 4, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-2, -4, -5);
    scene.add(backLight);

    // 🔁 Resize handler
    window.addEventListener('resize', () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    // 🔄 Continuous render loop for interaction
    function render() {
      requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    }
    render();

    // 📦 Load GLTF model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Keep original material & make sure both sides visible
        model.traverse((child) => {
          if (child.isMesh) {
            // Keep real material, but allow both sides and transparency if present
            child.material.side = THREE.DoubleSide;
            // Only set transparent if material supports it (defensive)
            if ('transparent' in child.material) {
              child.material.transparent = child.material.transparent || (child.material.opacity < 1.0);
            }
          }
        });

        // Add to scene initially (so bounding box can be computed correctly)
        scene.add(model);

        // 🧭 Center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Avoid division by zero
        const scale = maxDim > 0 ? (2 / maxDim) : 1;
        model.scale.multiplyScalar(scale);

        // Recompute box after scaling
        const boxScaled = new THREE.Box3().setFromObject(model);
        const center = boxScaled.getCenter(new THREE.Vector3());
        const sphere = boxScaled.getBoundingSphere(new THREE.Sphere());

        // Centering
        model.position.x = -center.x;
        model.position.y = -center.y;
        model.position.z = -center.z;

        // 🔄 Orientation fix — lung upright (adjust if your model is still rotated)
        model.rotation.x = Math.PI / 2;

        // 🎯 Configure camera and controls based on model size:
        // Use the bounding sphere radius to pick safe distances
        const radius = sphere.radius || Math.max(size.x, size.y, size.z) * 0.5 || 1;

        // Place camera so model fits nicely in view
        // distance multiplier: a value between ~1.5 - 4 gives a comfortable framing
        const distance = radius * 2.8;
        // Camera should look at the model center (which is world origin now)
        camera.position.set(0, 0, distance);
        camera.near = Math.max(0.001, radius * 0.001); // tiny near plane scaled to model
        camera.far = Math.max(1000, distance * 10);
        camera.updateProjectionMatrix();

        // Set controls target to model center (we centered model to origin)
        controls.target.set(0, 0, 0);
        // Set zoom limits relative to model radius
        controls.minDistance = Math.max(0.05, radius * 0.25); // can't get closer than ~25% radius
        controls.maxDistance = Math.max(distance * 3, radius * 20); // allow far out view
        controls.update();

        // Wire zoom buttons to move camera toward/away from where it's looking
        function doZoom(amount) {
          // amount > 0 = zoom in (move camera forward), amount < 0 = zoom out
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir); // points in the direction camera is looking
          camera.position.addScaledVector(dir, amount);
          // Clamp to controls distances
          const dist = camera.position.distanceTo(controls.target);
          const minD = controls.minDistance || 0.01;
          const maxD = controls.maxDistance || 1000;
          if (dist < minD) {
            // move back to minD
            camera.position.addScaledVector(dir, minD - dist);
          } else if (dist > maxD) {
            camera.position.addScaledVector(dir, -(dist - maxD));
          }
          controls.update();
        }

        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        if (zoomInBtn) zoomInBtn.addEventListener('click', () => doZoom(radius * 0.2));
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => doZoom(-radius * 0.2));

        // Ensure we render the final result
        renderer.render(scene, camera);
      },
      (xhr) => {
        if (xhr.total) {
          console.log(`${((xhr.loaded / xhr.total) * 100).toFixed(1)}% loaded`);
        } else {
          console.log('Loading model…');
        }
      },
      (error) => {
        console.error('Error loading model:', error);
        document.getElementById('status').innerText = '❌ Error loading 3D model';
      }
    );
  }
