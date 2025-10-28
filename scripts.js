import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GEMINI_CONFIG } from './config.js';

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

// Global variables for label management
let labelData = null;
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let model = null;
let raycaster = null;
let mouse = new THREE.Vector2();
let highlightedPart = null;
let labelMeshes = [];
let htmlLabels = []; // For tracking HTML labels
let labelMeshesWorld = []; // Store world positions of meshes
let labelMarkers = []; // 3D markers (spheres) at mesh positions
let labelLines = []; // Lines connecting labels to markers
let modelMeshes = []; // Flat list of mesh nodes in current model

// Mock ML classifier: always "kidney1" for testing kidney labels
function mockClassify() {
  return 'kidney1';
}

// ============================================
// GEMINI API INTEGRATION
// ============================================

async function generateOrganLabels(organType) {
  // TEMPORARY: Set this to true to skip API and use default labels immediately
  const SKIP_API = true;  // Set to true to skip API calls during testing
  
  try {
    console.log(`Starting to generate ${organType} labels...`);
    
    // Skip API if flag is set
    if (SKIP_API) {
      console.log('API skipped - using default labels');
      if (organType === 'kidney') labelData = getDefaultKidneyLabels();
      else if (organType === 'heart') labelData = getDefaultHeartLabels();
      else if (organType === 'lung') labelData = getDefaultLungLabels();
      else if (organType === 'liver') labelData = getDefaultLiverLabels();
      else if (organType === 'brain') labelData = getDefaultBrainLabels();
      return labelData;
    }
    
    const organName = organType === 'kidney' ? 'kidney' : 'heart';
    document.getElementById('label-description').innerHTML = `<div class="loading">🎓 Generating ${organName} anatomy labels with AI...</div>`;
    
    const organPrompt = organType === 'kidney' 
      ? 'kidney' 
      : 'heart';
    
    const prompt = `You are an anatomy expert. Generate a detailed list of important anatomical parts of the human ${organPrompt}. 
    
For each part, provide:
1. Name of the anatomical structure
2. A 2-3 sentence description suitable for educational purposes
3. Approximate 3D position as (x, y, z) coordinates relative to center (use typical anatomical positions)

Generate the response as a JSON array with this exact format:
[
  {
    "name": "Right Atrium",
    "description": "The right atrium is the upper chamber that receives deoxygenated blood from the body via the superior and inferior vena cava. It pumps blood into the right ventricle.",
    "position": [0.8, 0.5, 0.3]
  },
  ...
]

Include at least 8-10 key anatomical structures. For ${organPrompt}: ${organType === 'kidney' ? 'renal cortex, renal medulla, renal pelvis, nephrons, glomerulus, collecting ducts, ureter, etc.' : 'atria, ventricles, valves, major vessels.'}`;

    console.log('Calling Gemini API...');
    
    // Create a promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API timeout after 10 seconds')), 10000)
    );
    
    const fetchPromise = fetch(`${GEMINI_CONFIG.apiUrl}:generateContent?key=${GEMINI_CONFIG.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('Response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, response.statusText, errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
    
    // Extract text from Gemini response
    const generatedText = data.candidates[0].content.parts[0].text;
    console.log('Generated text:', generatedText);
    
    // Try to extract JSON from the response
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      labelData = JSON.parse(jsonMatch[0]);
      console.log('Parsed labels from AI:', labelData);
    } else {
      console.log('No JSON match found, using default labels');
      labelData = getDefaultHeartLabels();
    }
    
    return labelData;
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    console.log('Using fallback labels...');
    // Use fallback labels if API fails
    if (organType === 'kidney') labelData = getDefaultKidneyLabels();
    else if (organType === 'heart') labelData = getDefaultHeartLabels();
    else if (organType === 'lung') labelData = getDefaultLungLabels();
    else if (organType === 'liver') labelData = getDefaultLiverLabels();
    else if (organType === 'brain') labelData = getDefaultBrainLabels();
    return labelData;
  }
}

function getDefaultKidneyLabels() {
  // Positions adjusted for kidney model
  return [
    {
      name: "Renal Cortex",
      description: "The renal cortex is the outer layer of the kidney that contains the glomeruli and convoluted tubules. It is responsible for filtering blood and reabsorbing essential nutrients and water.",
      position: [0.8, 0.3, 0.1]
    },
    {
      name: "Renal Medulla",
      description: "The renal medulla is the inner region of the kidney, containing the renal pyramids. It plays a crucial role in concentrating urine and reabsorbing water.",
      position: [0.5, 0, 0.2]
    },
    {
      name: "Renal Pelvis",
      description: "The renal pelvis is a funnel-shaped structure that collects urine from the nephrons and channels it to the ureter. It is the first part of the renal collecting system.",
      position: [-0.3, -0.2, 0.15]
    },
    {
      name: "Renal Artery",
      description: "The renal artery supplies oxygenated blood to the kidney from the aorta. It branches into smaller arteries that deliver blood to the nephrons for filtration.",
      position: [-0.8, 0.5, 0.1]
    },
    {
      name: "Renal Vein",
      description: "The renal vein drains deoxygenated blood from the kidney after filtration. It returns blood to the inferior vena cava.",
      position: [-0.8, -0.5, 0.1]
    },
    {
      name: "Ureter",
      description: "The ureter is a muscular tube that transports urine from the kidney to the bladder. Peristaltic contractions help move urine along the urinary tract.",
      position: [-0.6, -0.4, -0.2]
    },
    {
      name: "Renal Capsule",
      description: "The renal capsule is the tough fibrous layer that surrounds the kidney, providing protection and helping to maintain the kidney's shape and structural integrity.",
      position: [0.9, 0.4, 0]
    },
    {
      name: "Glomerulus",
      description: "The glomerulus is a network of tiny blood vessels in the kidney that filters blood to form urine. It works with Bowman's capsule to create the renal corpuscle.",
      position: [0.7, 0.2, 0.25]
    },
    {
      name: "Renal Pyramid",
      description: "The renal pyramids are cone-shaped structures in the medulla that contain nephrons and collecting ducts. They transport urine to the calyces.",
      position: [0.4, -0.1, 0.3]
    },
    {
      name: "Nephron",
      description: "The nephron is the functional unit of the kidney responsible for filtering blood and producing urine. Each kidney contains approximately one million nephrons.",
      position: [0.6, 0.1, 0.3]
    }
  ];
}

function getDefaultHeartLabels() {
  // Positions adjusted to be closer to heart surface
  return [
    {
      name: "Right Atrium",
      description: "The right atrium is the upper chamber that receives deoxygenated blood from the body via the superior and inferior vena cava. It pumps blood into the right ventricle through the tricuspid valve.",
      position: [0.6, 0.4, 0.2]
    },
    {
      name: "Left Atrium",
      description: "The left atrium receives oxygen-rich blood from the lungs via the pulmonary veins. It pumps blood into the left ventricle through the mitral valve.",
      position: [-0.6, 0.4, 0.2]
    },
    {
      name: "Right Ventricle",
      description: "The right ventricle pumps deoxygenated blood to the lungs through the pulmonary artery. It has thinner walls than the left ventricle and is responsible for pulmonary circulation.",
      position: [0.6, -0.4, 0.2]
    },
    {
      name: "Left Ventricle",
      description: "The left ventricle is the largest and most muscular chamber. It pumps oxygenated blood to the entire body through the aorta, which requires significant force.",
      position: [-0.6, -0.4, 0.2]
    },
    {
      name: "Aorta",
      description: "The aorta is the largest artery in the body, carrying oxygenated blood from the left ventricle to the systemic circulation. It branches into smaller arteries that supply oxygen to all body tissues.",
      position: [-0.9, 0.2, 0.1]
    },
    {
      name: "Pulmonary Artery",
      description: "The pulmonary artery carries deoxygenated blood from the right ventricle to the lungs for oxygenation. It is one of the only arteries that carries deoxygenated blood.",
      position: [0.9, 0.2, 0.1]
    },
    {
      name: "Tricuspid Valve",
      description: "The tricuspid valve separates the right atrium from the right ventricle. It has three leaflets and prevents backflow of blood into the atrium during ventricular contraction.",
      position: [0.5, 0, 0.3]
    },
    {
      name: "Mitral Valve",
      description: "The mitral valve (or bicuspid valve) separates the left atrium from the left ventricle. It has two leaflets and ensures one-way blood flow from atrium to ventricle.",
      position: [-0.5, 0, 0.3]
    },
    {
      name: "Aortic Valve",
      description: "The aortic valve controls blood flow from the left ventricle into the aorta. It has three semilunar leaflets and opens during ventricular systole to eject blood.",
      position: [-0.8, -0.2, 0.15]
    },
    {
      name: "Pulmonary Valve",
      description: "The pulmonary valve controls blood flow from the right ventricle into the pulmonary artery. Like the aortic valve, it has three semilunar leaflets.",
      position: [0.8, -0.2, 0.15]
    }
  ];
}

function getDefaultLungLabels() {
  return [
    { name: "Right Lung Upper Lobe", description: "The upper lobe of the right lung involved in gas exchange.", position: [0.5, 0.4, 0.2] },
    { name: "Right Lung Middle Lobe", description: "The middle lobe of the right lung situated between upper and lower lobes.", position: [0.6, 0.1, 0.2] },
    { name: "Right Lung Lower Lobe", description: "The lower lobe of the right lung aiding in respiration.", position: [0.5, -0.4, 0.2] },
    { name: "Left Lung Upper Lobe", description: "The upper lobe of the left lung, includes the lingula.", position: [-0.6, 0.3, 0.2] },
    { name: "Left Lung Lower Lobe", description: "The lower lobe of the left lung responsible for gas exchange.", position: [-0.5, -0.4, 0.2] },
    { name: "Trachea", description: "The windpipe conducting air to the bronchi.", position: [0, 0.6, 0.2] },
    { name: "Right Main Bronchus", description: "Primary airway to the right lung.", position: [0.2, 0.2, 0.2] },
    { name: "Left Main Bronchus", description: "Primary airway to the left lung.", position: [-0.2, 0.2, 0.2] }
  ];
}

function getDefaultLiverLabels() {
  return [
    { name: "Right Lobe", description: "The larger lobe of the liver, handling various metabolic functions.", position: [0.6, 0.1, 0.1] },
    { name: "Left Lobe", description: "The smaller lobe extending across the midline.", position: [-0.4, 0.1, 0.1] },
    { name: "Caudate Lobe", description: "Small lobe located posteriorly near the inferior vena cava.", position: [-0.1, 0.2, -0.1] },
    { name: "Quadrate Lobe", description: "Small lobe on the inferior surface near the gallbladder.", position: [-0.1, -0.1, 0.1] },
    { name: "Gallbladder Fossa", description: "Depression where the gallbladder sits.", position: [0.2, -0.2, 0.1] },
    { name: "Porta Hepatis", description: "Gateway for hepatic artery, portal vein, and bile ducts.", position: [0, 0, 0.1] }
  ];
}

function getDefaultBrainLabels() {
  return [
    { name: "Frontal Lobe", description: "Responsible for executive functions, decision making, and motor control.", position: [0, 0.6, 0.3] },
    { name: "Parietal Lobe", description: "Processes sensory information such as touch and spatial orientation.", position: [0, 0.3, -0.1] },
    { name: "Temporal Lobe", description: "Handles auditory processing and memory.", position: [0.4, 0.1, 0] },
    { name: "Occipital Lobe", description: "Primary visual processing center.", position: [0, -0.3, -0.2] },
    { name: "Cerebellum", description: "Coordinates voluntary movements and balance.", position: [-0.2, -0.6, -0.1] },
    { name: "Brainstem", description: "Controls vital functions such as breathing and heart rate.", position: [0, -0.7, 0] }
  ];
}

// ============================================
// 3D LABEL SYSTEM - NEW VERSION WITH MESH TRACKING
// ============================================

// Function to find mesh by name or index
function findMeshByName(model, name) {
  // Try exact and partial name matching across collected meshes
  if (!modelMeshes || modelMeshes.length === 0) {
    modelMeshes = [];
    model.traverse((child) => { if (child.isMesh) modelMeshes.push(child); });
  }
  const lower = name.toLowerCase();
  // 1) Exact match
  let mesh = modelMeshes.find(m => m.name.toLowerCase() === lower);
  if (mesh) return mesh;
  // 2) Partial includes
  mesh = modelMeshes.find(m => m.name.toLowerCase().includes(lower));
  if (mesh) return mesh;
  // 3) Fuzzy keywords map for common organ terms
  const synonyms = [
    ['atrium','atrium','atria'],
    ['ventricle','ventricle','ventricles'],
    ['aorta','aorta'],
    ['pulmonary','pulmonary'],
    ['lobe','lobe','lobes'],
    ['bronch','bronchus','bronchi'],
    ['cortex','cortex'],
    ['medulla','medulla'],
    ['pyramid','pyramid','pyramids'],
    ['pelvis','pelvis'],
    ['ureter','ureter'],
    ['frontal','frontal'],
    ['temporal','temporal'],
    ['parietal','parietal'],
    ['occipital','occipital'],
    ['cerebellum','cerebellum'],
    ['brainstem','brainstem']
  ];
  for (const syn of synonyms) {
    if (syn.some(s => lower.includes(s))) {
      const candidate = modelMeshes.find(m => syn.some(s => m.name.toLowerCase().includes(s)));
      if (candidate) return candidate;
    }
  }
  return null;
}

// Get mesh center from bounding box in world space
function getMeshCenter(mesh) {
  // Calculate bounding box of the mesh
  const box = new THREE.Box3();
  mesh.updateMatrixWorld(); // Ensure mesh matrix is up to date
  
  // Get bounding box in local space
  box.setFromObject(mesh);
  
  // Get center in local space
  const localCenter = new THREE.Vector3();
  box.getCenter(localCenter);
  
  // Transform to world space
  const worldCenter = localCenter.applyMatrix4(mesh.matrixWorld);
  
  return worldCenter;
}

// Create HTML label
function createHTMLLabel(index, name) {
  const label = document.createElement('div');
  label.className = 'html-label';
  label.innerHTML = `
    <div class="html-label-number">${index + 1}</div>
    <div class="html-label-text">${name}</div>
  `;
  
  // Add click handler
  label.addEventListener('click', () => {
    if (labelData[index]) {
      const labelItem = document.querySelector(`[data-index="${index + 1}"]`);
      if (labelItem) {
        selectLabel(labelData[index], labelItem, index);
      }
    }
  });
  
  document.getElementById('canvas-container').appendChild(label);
  return label;
}

// Create 3D marker (sphere + line) at mesh position
function createLabelMarker(worldPos, index) {
  const markerGroup = new THREE.Group();
  
  // 1. Create a small glowing sphere at the mesh position
  const sphereGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x4CAF50,
    transparent: true,
    opacity: 0.9,
    emissive: 0x4CAF50,
    emissiveIntensity: 0.5,
    depthWrite: false
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(worldPos);
  markerGroup.add(sphere);
  
  // 2. Create line extending upward from marker
  const lineHeight = 0.2;
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    worldPos.clone(),
    worldPos.clone().add(new THREE.Vector3(0, lineHeight, 0))
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4CAF50, 
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  markerGroup.add(line);
  
  markerGroup.userData = { index, sphere, line };
  return markerGroup;
}

// Update HTML label positions in render loop
function updateHTMLLabels() {
  if (!model || labelMeshesWorld.length === 0) return;
  
  labelMeshesWorld.forEach((worldPos, index) => {
    if (htmlLabels[index]) {
      // Project 3D position to screen space
      const screenPos = worldPos.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
      
      // Only show if in front of camera
      if (screenPos.z < 1 && screenPos.z > 0) {
        htmlLabels[index].style.display = 'block';
        htmlLabels[index].style.left = x + 'px';
        htmlLabels[index].style.top = (y - 60) + 'px'; // Offset label above the 3D marker
      } else {
        htmlLabels[index].style.display = 'none';
      }
    }
  });
}

// OLD FUNCTION - Kept for reference but not used anymore
function createLabel(position, name, index) {
  // Create a marker group
  const group = new THREE.Group();
  
  // 1. Create a glowing sphere at the exact position
  const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x4CAF50,
    transparent: true,
    opacity: 0.9,
    emissive: 0x4CAF50,
    emissiveIntensity: 0.5
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0); // Relative to group
  group.add(sphere);
  
  // 2. Create a line that extends upward from the dot
  const lineHeight = 0.3;
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, lineHeight, 0)
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x4CAF50, 
    transparent: true,
    opacity: 0.8 
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  group.add(line);
  
  // 3. Create a text label at the top of the line
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size / 3; // Rectangular label
  
  const context = canvas.getContext('2d');
  
  // Draw rounded rectangle background
  context.fillStyle = 'rgba(76, 175, 80, 0.95)';
  const radius = 10;
  const x = radius;
  const y = 0;
  const width = size - 2 * radius;
  const height = size / 3;
  
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  
  // Add number badge on the left
  const badgeRadius = 25;
  context.fillStyle = 'white';
  context.beginPath();
  context.arc(badgeRadius, size / 6, badgeRadius, 0, 2 * Math.PI);
  context.fill();
  
  context.fillStyle = '#4CAF50';
  context.font = 'bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(index + 1, badgeRadius, size / 6);
  
  // Add text
  context.fillStyle = 'white';
  context.font = 'bold 24px Arial';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(name, 60, size / 6);
  
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ 
    map: texture, 
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.6, 0.2, 1);
  sprite.position.set(0, lineHeight + 0.15, 0); // Above the line
  
  group.add(sprite);
  
  // Position the entire group at the specified position
  group.position.set(position[0], position[1], position[2]);
  
  // Store data
  group.userData = { name, description: '', index: index + 1, sphere, sprite, line };
  
  return group;
}

function addLabelsToScene(modelPath = '') {
  console.log('Adding labels to scene...');
  if (!labelData || !scene || !model) {
    console.log('No label data, scene, or model available');
    return;
  }
  
  console.log(`Adding ${labelData.length} labels`);
  
  // Find meshes and store their world positions
  labelMeshesWorld = [];
  htmlLabels = [];
  labelMarkers = [];
  
  labelData.forEach((label, index) => {
    // Try to find mesh by name
    const mesh = findMeshByName(model, label.name);
    
    let center;
    if (mesh) {
      // Get mesh center in world space (function handles transformation)
      center = getMeshCenter(mesh);
      console.log(`Found mesh for "${label.name}" at position`, center);
    } else {
      // Fallback: use provided position
      center = new THREE.Vector3(label.position[0], label.position[1], label.position[2]);
      console.log(`Mesh not found for "${label.name}", using provided position`);
    }
    
    labelMeshesWorld.push(center);
    
    // Create 3D marker (sphere + line) at this position if available
    if (center) {
      const marker = createLabelMarker(center, index);
      scene.add(marker);
      labelMarkers.push(marker);
    }
    
    // Create HTML label
    const htmlLabel = createHTMLLabel(index, label.name);
    htmlLabels.push(htmlLabel);
  });
  
  // Populate labels list in side panel
  const labelsList = document.getElementById('labels-list');
  labelsList.innerHTML = '';
  
  labelData.forEach((label, index) => {
    // Add to labels list with number
    const labelItem = document.createElement('div');
    labelItem.className = 'label-item';
    labelItem.setAttribute('data-index', index + 1);
    labelItem.innerHTML = `
      <div class="label-item-number">${index + 1}</div>
      <div class="label-item-content">
        <div class="label-item-title">${label.name}</div>
        <div class="label-item-desc">${label.description.substring(0, 80)}...</div>
      </div>
    `;
    
    labelItem.addEventListener('click', () => {
      selectLabel(label, labelItem, index);
    });
    
    labelsList.appendChild(labelItem);
  });
  
  // Update the main description area
  const organName = modelPath.includes('kidney') ? 'kidney' : 'heart';
  document.getElementById('selected-label').textContent = `Select a ${organName} part to learn more`;
  document.getElementById('label-description').textContent = `Loaded ${labelData.length} anatomical structures. Click on any marker or list item to learn more!`;
  
  console.log('Labels added successfully');
}

function selectLabel(label, labelElement, index) {
  // Update selected label visual
  document.querySelectorAll('.label-item').forEach(item => {
    item.classList.remove('selected');
  });
  labelElement.classList.add('selected');
  
  // Update info panel
  document.getElementById('selected-label').textContent = label.name;
  document.getElementById('label-description').textContent = label.description;
  
  // Highlight the corresponding 3D marker
  highlightLabel(index);
}

function highlightLabel(index) {
  // Reset all HTML labels
  htmlLabels.forEach((label, i) => {
    if (label) {
      label.style.transform = 'translate(-50%, -50%) scale(1)';
      label.style.border = '2px solid white';
      label.style.zIndex = '1';
    }
  });
  
  // Reset all 3D markers
  labelMarkers.forEach((marker) => {
    if (marker.userData.sphere) {
      marker.userData.sphere.material.emissiveIntensity = 0.5;
      marker.userData.sphere.material.opacity = 0.9;
      marker.userData.sphere.scale.set(1, 1, 1);
    }
    if (marker.userData.line) {
      marker.userData.line.material.opacity = 0.6;
    }
  });
  
  // Highlight the selected HTML label
  if (htmlLabels[index]) {
    htmlLabels[index].style.transform = 'translate(-50%, -50%) scale(1.3)';
    htmlLabels[index].style.border = '3px solid #ffff00';
    htmlLabels[index].style.zIndex = '10';
    htmlLabels[index].style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.8)';
  }
  
  // Highlight the corresponding 3D marker
  if (labelMarkers[index]) {
    labelMarkers[index].userData.sphere.material.emissiveIntensity = 2.0;
    labelMarkers[index].userData.sphere.material.color.setHex(0xffff00);
    labelMarkers[index].userData.sphere.scale.set(2, 2, 2);
    
    if (labelMarkers[index].userData.line) {
      labelMarkers[index].userData.line.material.color.setHex(0xffff00);
      labelMarkers[index].userData.line.material.opacity = 1;
    }
  }
}

// ============================================
// CLICK INTERACTION SYSTEM
// ============================================

function setupClickInteraction() {
  // HTML labels are clickable, no need for canvas click detection
  // Users interact through the side panel or click on HTML labels directly
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

// Manual organ selector (dropdown)
const organSelect = document.getElementById('organSelect');
const loadOrganBtn = document.getElementById('loadOrganBtn');
if (organSelect && loadOrganBtn) {
  loadOrganBtn.addEventListener('click', () => {
    const val = organSelect.value;
    if (!val) return;
    const modelPath = organModels[val];
    if (!modelPath) return;

    document.getElementById('status').innerText = `Selected organ: ${val}`;
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('viewer-section').style.display = 'block';
    document.getElementById('model-name').innerText = val.toUpperCase();
    load3DModel(modelPath);
  });
}

// Three.js 3D Model Loader
async function load3DModel(modelPath) {
  // 🎨 Renderer
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x1a1a1a, 1);

  // 🌌 Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  
  // Initialize raycaster for click detection
  raycaster = new THREE.Raycaster();

  // 📷 Camera — set a small near plane so zooming very close doesn't clip
  camera = new THREE.PerspectiveCamera(
    75,
    canvas.clientWidth / canvas.clientHeight,
    0.01,   // lowered near plane
    1000
  );
  camera.position.set(0, 0, 4);
  // 🖱️ Orbit Controls

    // 🖱️ Orbit Controls
    controls = new OrbitControls(camera, canvas);
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
    controls.zoomSpeed = 0.3; // Smoother, more gradual zoom
    controls.rotateSpeed = 0.8;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    
    // Enable smooth zoom with damping
    controls.autoRotate = false;
    
    // Enable touch gestures (pinch to zoom, pan, rotate)
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

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
      updateHTMLLabels(); // Update HTML labels position each frame
    }
    render();

    // 📦 Load GLTF model
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      async (gltf) => {
        model = gltf.scene;

        // Keep original material & make sure both sides visible
        modelMeshes = [];
        model.traverse((child) => {
          if (child.isMesh) {
            // Keep real material, but allow both sides and transparency if present
            child.material.side = THREE.DoubleSide;
            // Only set transparent if material supports it (defensive)
            if ('transparent' in child.material) {
              child.material.transparent = child.material.transparent || (child.material.opacity < 1.0);
            }
            modelMeshes.push(child);
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

        // Wire zoom buttons
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        
        if (zoomInBtn) {
          zoomInBtn.addEventListener('click', () => {
            // Move camera closer to target
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            camera.position.addScaledVector(direction, -0.1);
            controls.update();
          });
        }
        
        if (zoomOutBtn) {
          zoomOutBtn.addEventListener('click', () => {
            // Move camera further from target
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            camera.position.addScaledVector(direction, 0.1);
            controls.update();
          });
        }

        // Ensure we render the final result
        renderer.render(scene, camera);
        
        // Detect organ type and generate labels
    let organType = null;
    if (modelPath.includes('heart')) organType = 'heart';
    else if (modelPath.includes('kidney')) organType = 'kidney';
    else if (modelPath.includes('lung')) organType = 'lung';
    else if (modelPath.includes('liver')) organType = 'liver';
    else if (modelPath.includes('brain')) organType = 'brain';
        
        if (organType) {
          console.log(`Loading ${organType} model - generating labels...`);
          try {
            // Generate labels using Gemini API or use defaults
            await generateOrganLabels(organType);
            addLabelsToScene(modelPath);
            setupClickInteraction();
          } catch (error) {
            console.error('Error in label generation:', error);
          // Force fallback labels
          if (organType === 'kidney') labelData = getDefaultKidneyLabels();
          else if (organType === 'heart') labelData = getDefaultHeartLabels();
          else if (organType === 'lung') labelData = getDefaultLungLabels();
          else if (organType === 'liver') labelData = getDefaultLiverLabels();
          else if (organType === 'brain') labelData = getDefaultBrainLabels();
            addLabelsToScene(modelPath);
            setupClickInteraction();
          }
        }
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
