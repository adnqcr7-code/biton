import * as THREE from 'three';

const PRICE = 349;
const viewer = document.getElementById('viewer');
const fallback = document.getElementById('viewerFallback');

/* ---------- 3D viewer ---------- */
const COLORWAYS = {
  obsidian: { name: 'Obsidian', cup: 0x111318, band: 0x0b0c0e, cushion: 0x17191d, yoke: 0x2a2e35 },
  storm:    { name: 'Storm',    cup: 0x2b4a6b, band: 0x16283c, cushion: 0x14181d, yoke: 0x3d5a78 },
  bone:     { name: 'Bone',     cup: 0xe9e7e2, band: 0xcfccc5, cushion: 0x17191d, yoke: 0xb9b5ac },
};
let colorway = 'obsidian';

let renderer, scene, camera, phones;
const matCup = new THREE.MeshPhysicalMaterial({ color: 0x111318, metalness: 0.6, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.3 });
const matBand = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, metalness: 0.35, roughness: 0.55 });
const matCushion = new THREE.MeshStandardMaterial({ color: 0x17191d, roughness: 0.95, metalness: 0 });
const matYoke = new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.85, roughness: 0.35 });
const matAccent = new THREE.MeshStandardMaterial({ color: 0x062a31, emissive: 0x67e8f9, emissiveIntensity: 1.8, roughness: 0.4 });

function buildPhones() {
  const g = new THREE.Group();

  // headband: upper half-torus
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.085, 20, 90, Math.PI), matBand);
  g.add(band);
  const bandPad = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.055, 16, 90, Math.PI), matCushion);
  bandPad.position.y = -0.015;
  g.add(bandPad);

  for (const side of [-1, 1]) {
    const cup = new THREE.Group();
    cup.position.set(side * 1.02, -0.28, 0);
    cup.rotation.z = -side * 0.06;

    // yoke: hinge from band end down to the cup
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.14), matYoke);
    yoke.position.set(0, 0.33, 0);
    cup.add(yoke);

    // cup body (axis along X)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.30, 48), matCup);
    body.rotation.z = Math.PI / 2;
    cup.add(body);

    // faceplate on the outer side
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 48), matCup);
    plate.rotation.z = Math.PI / 2;
    plate.position.x = side * 0.16;
    cup.add(plate);

    // glowing accent ring on the faceplate
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.018, 12, 72), matAccent);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * 0.19;
    cup.add(ring);

    // logo disc
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x1c2026, metalness: 0.7, roughness: 0.35 })
    );
    disc.rotation.y = side * Math.PI / 2;
    disc.position.x = side * 0.192;
    cup.add(disc);

    // ear cushion on the inner side
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.085, 16, 56), matCushion);
    cushion.rotation.y = Math.PI / 2;
    cushion.position.x = -side * 0.16;
    cup.add(cushion);

    g.add(cup);
  }
  return g;
}

function applyColorway(key) {
  const c = COLORWAYS[key];
  matCup.color.setHex(c.cup);
  matBand.color.setHex(c.band);
  matCushion.color.setHex(c.cushion);
  matYoke.color.setHex(c.yoke);
}

let rotY = -0.55, rotX = 0.08, velY = 0, dragging = false, lastX = 0, lastY = 0, lastInteract = 0;
let spinOn = true;

function initViewer() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    fallback.style.display = 'grid';
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  viewer.prepend(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, viewer.clientWidth / viewer.clientHeight, 0.1, 100);
  camera.position.set(0, 0.35, 4.6);
  camera.lookAt(0, -0.05, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ef0ff, 1.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffd9a0, 6, 14);
  fill.position.set(-2, -1, 3);
  scene.add(fill);

  phones = buildPhones();
  applyColorway(colorway);
  scene.add(phones);

  // floor glow
  const glow1 = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 48),
    new THREE.MeshBasicMaterial({ color: 0x0e7490, transparent: true, opacity: 0.10, depthWrite: false })
  );
  glow1.rotation.x = -Math.PI / 2;
  glow1.position.y = -1.18;
  scene.add(glow1);
  const glow2 = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 48),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.14, depthWrite: false })
  );
  glow2.rotation.x = -Math.PI / 2;
  glow2.position.y = -1.17;
  scene.add(glow2);

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; velY = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    rotY += dx * 0.005;
    rotX = Math.max(-0.3, Math.min(0.55, rotX + dy * 0.004));
    velY = dx * 0.005;
    lastInteract = performance.now();
  });
  const endDrag = () => { dragging = false; lastInteract = performance.now(); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.position.z = Math.max(3.4, Math.min(6.5, camera.position.z + e.deltaY * 0.002));
    lastInteract = performance.now();
  }, { passive: false });

  new ResizeObserver(() => {
    const w = viewer.clientWidth, h = viewer.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(viewer);

  const tick = () => {
    requestAnimationFrame(tick);
    const now = performance.now();
    if (!dragging) {
      rotY += velY;
      velY *= 0.95;
      if (spinOn && now - lastInteract > 2500) rotY += 0.0035;
    }
    phones.rotation.y = rotY;
    phones.rotation.x = rotX;
    phones.position.y = Math.sin(now * 0.0012) * 0.035;
    renderer.render(scene, camera);
    if (!window.__done) window.__done = true;
  };
  tick();
  return true;
}

initViewer();

/* ---------- colorways ---------- */
const swatches = document.querySelectorAll('.swatch');
swatches.forEach((btn) => {
  btn.addEventListener('click', () => {
    colorway = btn.dataset.color;
    swatches.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    document.getElementById('colorName').textContent = COLORWAYS[colorway].name;
    applyColorway(colorway);
    if (phones) { phones.scale.setScalar(1.04); setTimeout(() => phones.scale.setScalar(1), 140); }
    renderCart();
  });
});

/* ---------- auto-spin toggle ---------- */
const spinToggle = document.getElementById('spinToggle');
spinToggle.addEventListener('click', () => {
  spinOn = !spinOn;
  spinToggle.setAttribute('aria-pressed', String(spinOn));
  spinToggle.textContent = spinOn ? '⟳ Auto-spin on' : '⟳ Auto-spin off';
  lastInteract = performance.now();
});

/* ---------- cart ---------- */
let qty = 0;
const drawerBody = document.getElementById('drawerBody');
const drawerFoot = document.getElementById('drawerFoot');
const cartCount = document.getElementById('cartCount');
const toast = document.getElementById('toast');
let toastTimer;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderCart() {
  cartCount.textContent = qty > 0 ? String(qty) : '';
  if (qty === 0) {
    drawerBody.innerHTML = '<p class="cart-empty">Your bag is empty.<br>Add ONYX One and it will show up here.</p>';
    drawerFoot.hidden = true;
    return;
  }
  drawerFoot.hidden = false;
  document.getElementById('subtotalLabel').textContent = '$' + (qty * PRICE).toLocaleString();
  drawerBody.innerHTML = `
    <div class="cart-item">
      <div class="cart-thumb">🎧</div>
      <div class="cart-item-info">
        <b>ONYX One</b>
        <span>${COLORWAYS[colorway].name} · $${PRICE}</span>
        <div class="qty-row">
          <button class="qty-btn" id="qtyMinus" type="button" aria-label="One fewer">−</button>
          <span>${qty}</span>
          <button class="qty-btn" id="qtyPlus" type="button" aria-label="One more">+</button>
        </div>
      </div>
      <span class="cart-item-price">$${(qty * PRICE).toLocaleString()}</span>
    </div>`;
  document.getElementById('qtyMinus').addEventListener('click', () => { qty = Math.max(0, qty - 1); renderCart(); });
  document.getElementById('qtyPlus').addEventListener('click', () => { qty++; renderCart(); });
}

function addToBag() {
  qty++;
  renderCart();
  document.body.classList.add('cart-open');
  showToast(`Added ONYX One (${COLORWAYS[colorway].name}) to your bag`);
}
document.getElementById('addToBag').addEventListener('click', addToBag);
document.getElementById('addToBag2').addEventListener('click', addToBag);

document.getElementById('openCart').addEventListener('click', () => document.body.classList.add('cart-open'));
document.getElementById('closeCart').addEventListener('click', () => document.body.classList.remove('cart-open'));
document.getElementById('drawerBackdrop').addEventListener('click', () => document.body.classList.remove('cart-open'));
document.getElementById('checkoutBtn').addEventListener('click', () => showToast('Demo storefront — checkout is disabled.'));
renderCart();
