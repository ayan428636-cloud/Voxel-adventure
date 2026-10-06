const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  innerWidth / innerHeight,
  0.05,
  500
);

const renderer = new THREE.WebGLRenderer({
  antialias: false
});

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

document.getElementById("game").appendChild(renderer.domElement);


// ======================================================
// LICHT
// ======================================================

scene.add(new THREE.HemisphereLight(
  0xffffff,
  0x555555,
  1.5
));

const sun = new THREE.DirectionalLight(
  0xffffff,
  1.2
);

sun.position.set(50,100,30);
scene.add(sun);


// ======================================================
// WELT
// ======================================================

const WORLD_SIZE = 40;
const WORLD_BOTTOM = 0;

const blocks = new Map();

const materials = {

  grass: new THREE.MeshLambertMaterial({
    color:0x55aa44
  }),

  dirt: new THREE.MeshLambertMaterial({
    color:0x80552d
  }),

  stone: new THREE.MeshLambertMaterial({
    color:0x777777
  }),

  wood: new THREE.MeshLambertMaterial({
    color:0x8b5a2b
  }),

  leaves: new THREE.MeshLambertMaterial({
    color:0x247a35
  }),

  sand: new THREE.MeshLambertMaterial({
    color:0xd9c27a
  }),

  glass: new THREE.MeshLambertMaterial({
    color:0x8fdcff,
    transparent:true,
    opacity:.45
  }),

  luxuryOre: new THREE.MeshLambertMaterial({
    color:0xffee75,
    emissive:0x665500
  }),

  planks: new THREE.MeshLambertMaterial({
    color:0xb98248
  }),

  furnace: new THREE.MeshLambertMaterial({
    color:0x333333
  })
};

const blockNames = {
  grass:"Gras",
  dirt:"Erde",
  stone:"Stein",
  wood:"Holz",
  leaves:"Blätter",
  sand:"Sand",
  glass:"Glas",
  luxuryOre:"Luxus-Erz",
  planks:"Bretter",
  furnace:"Ofen"
};

const cubeGeometry = new THREE.BoxGeometry(1,1,1);

function key(x,y,z){
  return `${x},${y},${z}`;
}

function createBlock(x,y,z,type){

  const k = key(x,y,z);

  if(blocks.has(k)) return;

  const mesh = new THREE.Mesh(
    cubeGeometry,
    materials[type] || materials.stone
  );

  mesh.position.set(x+.5,y+.5,z+.5);

  mesh.userData.x = x;
  mesh.userData.y = y;
  mesh.userData.z = z;
  mesh.userData.type = type;

  scene.add(mesh);
  blocks.set(k,mesh);
}

function removeBlock(x,y,z){

  const k = key(x,y,z);
  const mesh = blocks.get(k);

  if(!mesh) return null;

  scene.remove(mesh);
  blocks.delete(k);

  return mesh.userData.type;
}


// ======================================================
// DETERMINISTISCHE RANDOM-FUNKTION
// ======================================================

function hash3(x,y,z){

  const n =
    Math.sin(
      x * 12.9898 +
      y * 78.233 +
      z * 37.719
    ) * 43758.5453;

  return n - Math.floor(n);
}


// ======================================================
// TERRAIN
// ======================================================

function terrainHeight(x,z){

  const a =
    Math.sin(x*.17) * 1.5;

  const b =
    Math.cos(z*.15) * 1.3;

  const c =
    Math.sin((x+z)*.09) * 1.2;

  return Math.max(
    4,
    Math.floor(7 + a + b + c)
  );
}


// ======================================================
// HÖHLEN
// ======================================================

function caveNoise(x,y,z){

  const n1 =
    Math.sin(
      x*.19 +
      z*.13 +
      y*.33
    );

  const n2 =
    Math.cos(
      x*.11 -
      z*.1 +
      y*.31
    );

  const n3 =
    Math.sin(
      x*.07 +
      z*.27 -
      y*.37
    );

  return (n1+n2+n3)/3;
}

function isCave(x,y,z,h){

  // Spawnbereich bleibt stabil
  if(Math.hypot(x,z) < 7) return false;

  // Nur unterirdisch
  if(y < 2) return false;
  if(y >= h-1) return false;

  const n = caveNoise(x,y,z);

  const tunnel =
    n > .70;

  const chamber =
    Math.abs(
      Math.sin(x*.10 + z*.14)
    ) < .10 &&
    Math.abs(
      Math.cos(y*.38 + x*.08 - z*.09)
    ) < .25;

  return tunnel || chamber;
}


// ======================================================
// World generate
// ======================================================

function generateWorld(){
}

generateWorld();

  for(let x=-WORLD_SIZE;x<=WORLD_SIZE;x++){

    for(let z=-WORLD_SIZE;z<=WORLD_SIZE;z++){

      const h = terrainHeight(x,z);

      for(let y=WORLD_BOTTOM;y<=h;y++){

        if(isCave(x,y,z,h)){
          continue;
        }

        let type;

        if(y === h){
          type = "grass";
        }
        else if(y >= h-2){
          type = "dirt";
        }
        else{
          type = "stone";
        }

        // Luxus-Erz tief unter der Erde
        if(
          type === "stone" &&
          y >= 2 &&
          y <= h-2 &&
          hash3(x,y,z) < .012
        ){
          type = "luxuryOre";
        }

        createBlock(x,y,z,type);
      }

      // Bäume
      if(
        h >= 6 &&
        hash3(x,999,z) < .035 &&
        Math.abs(x) > 4 &&
        Math.abs(z) > 4
      ){

        const trunkHeight = 3 + Math.floor(
          hash3(x,998,z) * 2
        );

        for(let y=1;y<=trunkHeight;y++){
          createBlock(
            x,
            h+y,
            z,
            "wood"
          );
        }

        for(
          let dx=-2;
          dx<=2;
          dx++
        ){

          for(
            let dz=-2;
            dz<=2;
            dz++
          ){

            for(
              let dy=trunkHeight-1;
              dy<=trunkHeight+2;
              dy++
            ){

              if(
                Math.abs(dx)+
                Math.abs(dz) < 4
              ){

                createBlock(
                  x+dx,
                  h+dy,
                  z+dz,
                  "leaves"
                );
              }
            }
          }
        }
      }
    }
  }

generateWorld();


// ======================================================
// INVENTAR
// ======================================================

const inventory = {

  dirt:20,
  grass:10,
  stone:30,
  wood:10,
  leaves:10,
  sand:10,
  glass:6,
  planks:10,

  luxuryOre:0,
  luxury_ingot:0,

  furnace:0,
  pickaxe:1,

  helmet:0,
  chestplate:0,
  leggings:0,
  boots:0
};

const hotbar = [
  "dirt",
  "stone",
  "wood",
  "planks",
  "sand",
  "glass",
  "luxuryOre"
];

let selectedSlot = 0;


// ======================================================
// RÜSTUNG
// ======================================================

const armor = {
  helmet:false,
  chestplate:false,
  leggings:false,
  boots:false
};

function armorCount(){

  return Object.values(armor)
    .filter(Boolean)
    .length;
}


// ======================================================
// PLAYER
// ======================================================

const player = {

  position:new THREE.Vector3(
    .5,
    terrainHeight(0,0)+2,
    .5
  ),

  velocity:new THREE.Vector3(),

  health:10,

  onGround:false
};


// ======================================================
// EIGENER BLOCK-CHARAKTER
// ======================================================

const playerGroup = new THREE.Group();

scene.add(playerGroup);

let skinType =
  Math.random() < .5
  ? "blue"
  : "green";

function createPlayerModel(){

  while(playerGroup.children.length){
    playerGroup.remove(
      playerGroup.children[0]
    );
  }

  const skinColor =
    skinType === "blue"
    ? 0x3d78d8
    : 0x3daa63;

  const skinMat =
    new THREE.MeshLambertMaterial({
      color:skinColor
    });

  const faceMat =
    new THREE.MeshLambertMaterial({
      color:0xf0bd91
    });

  const hairMat =
    new THREE.MeshLambertMaterial({
      color:
        skinType === "blue"
        ? 0x4b301d
        : 0x252525
    });

  const pantsMat =
    new THREE.MeshLambertMaterial({
      color:0x333b88
    });

  const body =
    new THREE.Mesh(
      new THREE.BoxGeometry(.65,.8,.35),
      skinMat
    );

  body.position.y=1.2;

  playerGroup.add(body);

  const head =
    new THREE.Mesh(
      new THREE.BoxGeometry(.62,.62,.62),
      faceMat
    );

  head.position.y=1.95;

  playerGroup.add(head);

  const hair =
    new THREE.Mesh(
      new THREE.BoxGeometry(.64,.18,.64),
      hairMat
    );

  hair.position.y=2.25;

  playerGroup.add(hair);

  const arm1 =
    new THREE.Mesh(
      new THREE.BoxGeometry(.22,.72,.28),
      skinMat
    );

  arm1.position.set(-.45,1.25,0);

  playerGroup.add(arm1);

  const arm2 =
    arm1.clone();

  arm2.position.x=.45;

  playerGroup.add(arm2);

  const leg1 =
    new THREE.Mesh(
      new THREE.BoxGeometry(.25,.75,.3),
      pantsMat
    );

  leg1.position.set(-.18,.43,0);

  playerGroup.add(leg1);

  const leg2 =
    leg1.clone();

  leg2.position.x=.18;

  playerGroup.add(leg2);

  updateArmorVisuals();
}


// ======================================================
// RÜSTUNGS-DARSTELLUNG
// ======================================================

let armorVisuals = [];

function updateArmorVisuals(){
 
 createPlayerModel();
 
  for(const obj of armorVisuals){
    playerGroup.remove(obj);
  }

  armorVisuals=[];

  const armorMat =
    new THREE.MeshLambertMaterial({
      color:0xfff2a0,
      emissive:0x554400
    });

  if(armor.helmet){

    const helmet =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .7,.25,.7
        ),
        armorMat
      );

    helmet.position.y=2.28;

    playerGroup.add(helmet);
    armorVisuals.push(helmet);
  }

  if(armor.chestplate){

    const chest =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .72,.85,.42
        ),
        armorMat
      );

    chest.position.y=1.2;

    playerGroup.add(chest);
    armorVisuals.push(chest);
  }

  if(armor.leggings){

    const legs =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .6,.45,.38
        ),
        armorMat
      );

    legs.position.y=.63;

    playerGroup.add(legs);
    armorVisuals.push(legs);
  }

  if(armor.boots){

    const boots =
      new THREE.Mesh(
        new THREE.BoxGeometry(
          .62,.22,.4
        ),
        armorMat
      );

    boots.position.y=.12;

    playerGroup.add(boots);
    armorVisuals.push(boots);
  }
}


// ======================================================
// FIRST / THIRD PERSON
// ======================================================

let thirdPerson=false;

function toggleView(){

  thirdPerson=!thirdPerson;

  playerGroup.visible=thirdPerson;
}


// ======================================================
// BODEN FÜR HÖHLEN
// ======================================================

function getGroundY(px,pz,py){

  const bx=Math.floor(px);
  const bz=Math.floor(pz);

  let start=
    Math.min(
      40,
      Math.floor(py)
    );

  for(let y=start;y>=0;y--){

    if(blocks.has(
      key(bx,y,bz)
    )){
      return y+1;
    }
  }

  return 1;
}


// ======================================================
// PLAYER UPDATE
// ======================================================

const keys={};

window.addEventListener(
  "keydown",
  e=>{
    keys[e.code]=true;

    if(e.code==="KeyE"){
      toggleInventory();
    }

    if(e.code==="KeyV"){
      toggleView();
    }

    if(e.code==="Space"){
      jump();
    }
  }
);

window.addEventListener(
  "keyup",
  e=>{
    keys[e.code]=false;
  }
);

function jump(){

  if(player.onGround){

    player.velocity.y=7;
    player.onGround=false;
  }
}

let mobileX=0;
let mobileZ=0;

function updatePlayer(dt){

  const speed =
    thirdPerson ? 5 : 5;

  let forward=0;
  let strafe=0;

  if(keys.KeyW) forward+=1;
  if(keys.KeyS) forward-=1;
  if(keys.KeyA) strafe-=1;
  if(keys.KeyD) strafe+=1;

  forward+=mobileZ;
  strafe+=mobileX;

  const length =
    Math.hypot(
      forward,
      strafe
    );

  if(length>1){

    forward/=length;
    strafe/=length;
  }

  player.velocity.x =
    strafe*speed;

  player.velocity.z =
    -forward*speed;

  player.velocity.y -=
    18*dt;

  player.position.x +=
    player.velocity.x*dt;

  player.position.z +=
    player.velocity.z*dt;

  player.position.y +=
    player.velocity.y*dt;

  // Weltgrenze
  player.position.x =
    Math.max(
      -WORLD_SIZE+1,
      Math.min(
        WORLD_SIZE-1,
        player.position.x
      )
    );

  player.position.z =
    Math.max(
      -WORLD_SIZE+1,
      Math.min(
        WORLD_SIZE-1,
        player.position.z
      )
    );

  const ground =
    getGroundY(
      player.position.x,
      player.position.z,
      player.position.y
    );

  if(player.position.y <= ground){

    player.position.y=ground;
    player.velocity.y=0;
    player.onGround=true;

  }else{

    player.onGround=false;
  }

  playerGroup.position.copy(
    player.position
  );

  playerGroup.rotation.y =
    Math.atan2(
      player.velocity.x,
      -player.velocity.z
    );
}


// ======================================================
// KAMERA
// ======================================================

let yaw=0;
let pitch=-.15;

function updateCamera(){

  if(thirdPerson){

    const distance=5;

    const target =
      player.position.clone();

    target.y+=1.4;

    const offset =
      new THREE.Vector3(
        Math.sin(yaw)*distance,
        2.2,
        Math.cos(yaw)*distance
      );

    camera.position.copy(
      target.clone().add(offset)
    );

    camera.lookAt(target);

  }else{

    camera.position.set(
      player.position.x,
      player.position.y+1.6,
      player.position.z
    );

    camera.rotation.order="YXZ";

    camera.rotation.y=yaw;
    camera.rotation.x=pitch;
  }
}


// ======================================================
// BLOCK ZIELEN
// ======================================================

const raycaster =
  new THREE.Raycaster();

function getTarget(){

  raycaster.setFromCamera(
    new THREE.Vector2(0,0),
    camera
  );

  const hits =
    raycaster.intersectObjects(
      Array.from(blocks.values()),
      false
    );

  return hits.length
    ? hits[0]
    : null;
}


// ======================================================
// ABBauen
// ======================================================

function breakBlock(){

  const hit=getTarget();

  if(!hit) return;

  const b=hit.object.userData;

  const type =
    removeBlock(
      b.x,
      b.y,
      b.z
    );

  if(type){

    inventory[type] =
      (inventory[type]||0)+1;

    updateAllUI();
    saveGame();
  }
}


// ======================================================
// PLATZIEREN
// ======================================================

function placeBlock(){

  const hit=getTarget();

  if(!hit) return;

  const type =
    hotbar[selectedSlot];

  if(!inventory[type]) return;

  const b=hit.object.userData;

  const normal =
    hit.face.normal.clone();

  const x =
    b.x + Math.round(normal.x);

  const y =
    b.y + Math.round(normal.y);

  const z =
    b.z + Math.round(normal.z);

  if(
    Math.abs(
      x-player.position.x
    )<1 &&
    Math.abs(
      y-player.position.y
    )<2 &&
    Math.abs(
      z-player.position.z
    )<1
  ){
    return;
  }

  if(blocks.has(
    key(x,y,z)
  )){
    return;
  }

  createBlock(
    x,y,z,type
  );

  inventory[type]--;

  updateAllUI();
  saveGame();
}


// ======================================================
// MOUSE
// ======================================================

renderer.domElement.addEventListener(
  "mousedown",
  e=>{

    if(
      document.pointerLockElement !==
      renderer.domElement
    ){
      renderer.domElement.requestPointerLock();
      return;
    }

    if(e.button===0){
      breakBlock();
    }

    if(e.button===2){
      placeBlock();
    }
  }
);

window.addEventListener(
  "contextmenu",
  e=>e.preventDefault()
);

window.addEventListener(
  "mousemove",
  e=>{

    if(
      document.pointerLockElement !==
      renderer.domElement
    ){
      return;
    }

    yaw -= e.movementX*.002;
    pitch -= e.movementY*.002;

    pitch =
      Math.max(
        -1.45,
        Math.min(
          1.45,
          pitch
        )
      );
  }
);


// ======================================================
// MOBILE KAMERA
// ======================================================

let lookTouch=null;

renderer.domElement.addEventListener(
  "touchstart",
  e=>{

    if(e.touches.length!==1) return;

    const t=e.touches[0];

    lookTouch={
      id:t.identifier,
      x:t.clientX,
      y:t.clientY
    };
  }
);

renderer.domElement.addEventListener(
  "touchmove",
  e=>{

    if(!lookTouch) return;

    const t =
      Array.from(
        e.touches
      ).find(
        x=>x.identifier===lookTouch.id
      );

    if(!t) return;

    const dx =
      t.clientX-lookTouch.x;

    const dy =
      t.clientY-lookTouch.y;

    yaw-=dx*.006;
    pitch-=dy*.006;

    pitch=
      Math.max(
        -1.45,
        Math.min(
          1.45,
          pitch
        )
      );

    lookTouch.x=t.clientX;
    lookTouch.y=t.clientY;
  }
);

renderer.domElement.addEventListener(
  "touchend",
  ()=>{
    lookTouch=null;
  }
);


// ======================================================
// JOYSTICK
// ======================================================

const joystick =
  document.getElementById("joystick");

const stick =
  document.getElementById("stick");

let joyTouch=null;

joystick.addEventListener(
  "touchstart",
  e=>{

    const t=e.touches[0];

    joyTouch=t.identifier;
    updateJoystick(t);
  }
);

joystick.addEventListener(
  "touchmove",
  e=>{

    const t=
      Array.from(
        e.touches
      ).find(
        x=>x.identifier===joyTouch
      );

    if(t) updateJoystick(t);
  }
);

joystick.addEventListener(
  "touchend",
  ()=>{
    joyTouch=null;
    mobileX=0;
    mobileZ=0;

    stick.style.left="37px";
    stick.style.top="37px";
  }
);

function updateJoystick(t){

  const r =
    joystick.getBoundingClientRect();

  let dx =
    t.clientX -
    (r.left+r.width/2);

  let dy =
    t.clientY -
    (r.top+r.height/2);

  const max=38;

  const len=
    Math.hypot(dx,dy);

  if(len>max){

    dx=dx/len*max;
    dy=dy/len*max;
  }

  stick.style.left =
    `${37+dx}px`;

  stick.style.top =
    `${37+dy}px`;

  mobileX =
    dx/max;

  mobileZ =
    -dy/max;
}


// ======================================================
// MOBILE BUTTONS
// ======================================================

document.getElementById(
  "jumpBtn"
).addEventListener(
  "touchstart",
  e=>{
    e.preventDefault();
    jump();
  }
);

document.getElementById(
  "breakBtn"
).addEventListener(
  "touchstart",
  e=>{
    e.preventDefault();
    breakBlock();
  }
);

document.getElementById(
  "placeBtn"
).addEventListener(
  "touchstart",
  e=>{
    e.preventDefault();
    placeBlock();
  }
);

document.getElementById(
  "invBtn"
).addEventListener(
  "touchstart",
  e=>{
    e.preventDefault();
    toggleInventory();
  }
);


// ======================================================
// HOTBAR
// ======================================================

function updateHotbar(){

  const bar =
    document.getElementById(
      "hotbar"
    );

  bar.innerHTML="";

  hotbar.forEach(
    (type,i)=>{

      const slot =
        document.createElement(
          "div"
        );

      slot.className="slot";

      if(i===selectedSlot){
        slot.classList.add(
          "selected"
        );
      }

      slot.textContent =
        icon(type);

      const count =
        document.createElement(
          "small"
        );

      count.textContent =
        inventory[type]||0;

      slot.appendChild(count);

      slot.addEventListener(
        "click",
        ()=>{
          selectedSlot=i;
          updateHotbar();
        }
      );

      bar.appendChild(slot);
    }
  );
}

function icon(type){

  const icons={

    dirt:"🟫",
    grass:"🟩",
    stone:"⬜",
    wood:"🪵",
    leaves:"🌿",
    sand:"🟨",
    glass:"🔷",
    luxuryOre:"💎",
    planks:"🟧",
    furnace:"🔥",
    pickaxe:"⛏️",
    helmet:"🪖",
    chestplate:"🛡️",
    leggings:"👖",
    boots:"🥾",
    luxury_ingot:"✨"
  };

  return icons[type]||"❔";
}


// ======================================================
// INVENTAR UI
// ======================================================

function updateInventoryUI(){

  const items =
    document.getElementById(
      "items"
    );

  items.innerHTML="";

  for(const type in inventory){

    const slot =
      document.createElement(
        "div"
      );

    slot.className="slot";

    slot.textContent =
      icon(type);

    const count =
      document.createElement(
        "small"
      );

    count.textContent =
      inventory[type];

    slot.appendChild(count);

    if(
      ["helmet",
       "chestplate",
       "leggings",
       "boots"]
      .includes(type)
    ){

      slot.style.cursor="pointer";

      slot.addEventListener(
        "click",
        ()=>{
          toggleArmor(type);
        }
      );
    }

    items.appendChild(slot);
  }

  updateArmorUI();
}

function updateArmorUI(){

  document.querySelectorAll(
    ".armorSlot"
  ).forEach(slot=>{

    const type =
      slot.dataset.armor;

    if(armor[type]){

      slot.textContent =
        icon(type);

      slot.style.borderColor =
        "#fff2a0";

    }else{

      slot.textContent =
        type;

      slot.style.borderColor =
        "#777";
    }
  });
}

function toggleArmor(type){

  if(armor[type]){

    armor[type]=false;
    inventory[type]++;

  }else{

    if(!inventory[type]) return;

    inventory[type]--;
    armor[type]=true;
  }

  updateArmorVisuals();
  updateInventoryUI();
  updateHUD();
  saveGame();
}


// ======================================================
// CRAFTING
// ======================================================

window.craft=function(recipe){

  function has(type,n){
    return (
      inventory[type]||0
    ) >= n;
  }

  function take(type,n){
    inventory[type]-=n;
  }

  if(recipe==="planks"){

    if(!has("wood",1)) return;

    take("wood",1);
    inventory.planks+=4;
  }

  if(recipe==="pickaxe"){

    if(
      !has("stone",3) ||
      !has("planks",2)
    ) return;

    take("stone",3);
    take("planks",2);

    inventory.pickaxe++;
  }

  if(recipe==="furnace"){

    if(!has("stone",8)) return;

    take("stone",8);
    inventory.furnace++;
  }

  if(recipe==="luxury_ingot"){

    if(!has("luxuryOre",8)) return;

    take("luxuryOre",8);
    inventory.luxury_ingot++;
  }

  if(recipe==="helmet"){

    if(!has("luxury_ingot",5)) return;

    take("luxury_ingot",5);
    inventory.helmet++;
  }

  if(recipe==="chestplate"){

    if(!has("luxury_ingot",8)) return;

    take("luxury_ingot",8);
    inventory.chestplate++;
  }

  if(recipe==="leggings"){

    if(!has("luxury_ingot",7)) return;

    take("luxury_ingot",7);
    inventory.leggings++;
  }

  if(recipe==="boots"){

    if(!has("luxury_ingot",4)) return;

    take("luxury_ingot",4);
    inventory.boots++;
  }

  updateAllUI();
  saveGame();
};


// ======================================================
// INVENTAR ÖFFNEN
// ======================================================

function toggleInventory(){

  document
    .getElementById("inventory")
    .classList.toggle("open");
}

window.toggleInventory =
  toggleInventory;


// ======================================================
// HUD
// ======================================================

function updateHUD(){

  const full =
    "❤️".repeat(
      Math.max(
        0,
        Math.floor(player.health)
      )
    );

  document.getElementById(
    "hearts"
  ).textContent=full;

  document.getElementById(
    "info"
  ).textContent =
    `XYZ: ${
      Math.floor(player.position.x)
    } / ${
      Math.floor(player.position.y)
    } / ${
      Math.floor(player.position.z)
    } | Rüstung: ${
      armorCount()
    }/4 | ${
      skinType==="blue"
      ? "Blauer Abenteurer"
      : "Grüner Abenteurer"
    }`;
}

function updateAllUI(){

  updateHotbar();
  updateInventoryUI();
  updateHUD();
}


// ======================================================
// SPEICHERN
// ======================================================

function saveGame(){

  const data={

    inventory,
    armor,
    position:[
      player.position.x,
      player.position.y,
      player.position.z
    ],
    health:player.health,
    skinType
  };

  localStorage.setItem(
    "voxelAdventureSave",
    JSON.stringify(data)
  );
}

function loadGame(){

  const raw =
    localStorage.getItem(
      "voxelAdventureSave"
    );

  if(!raw) return;

  try{

    const data=
      JSON.parse(raw);

    if(data.inventory){

      for(const key in data.inventory){

        if(
          Object.prototype.hasOwnProperty.call(
            inventory,
            key
          )
        ){
          inventory[key]=
            data.inventory[key];
        }
      }
    }

    if(data.armor){

      for(const key in armor){

        armor[key]=
          !!data.armor[key];
      }
    }

    if(
      Array.isArray(data.position)
    ){

      player.position.set(
        data.position[0],
        data.position[1],
        data.position[2]
      );
    }

    if(typeof data.health==="number"){
      player.health=data.health;
    }

    if(
      data.skinType==="blue" ||
      data.skinType==="green"
    ){

      skinType=data.skinType;
      createPlayerModel();
    }

  }catch(err){

    console.warn(
      "Save konnte nicht geladen werden",
      err
    );
  }
}

loadGame();


// ======================================================
// START
// ======================================================

document.getElementById(
  "startBtn"
).addEventListener(
  "click",
  ()=>{

    document.getElementById(
      "startScreen"
    ).style.display="none";

    renderer.domElement.requestPointerLock();

    updateAllUI();
  }
);


// ======================================================
// RESIZE
// ======================================================

window.addEventListener(
  "resize",
  ()=>{

    camera.aspect =
      innerWidth/innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);


// ======================================================
// GAME LOOP
// ======================================================

let lastTime=performance.now();

function animate(now){

  requestAnimationFrame(animate);

  const dt=
    Math.min(
      .05,
      (now-lastTime)/1000
    );

  lastTime=now;

  updatePlayer(dt);
  updateCamera();
  updateHUD();

  renderer.render(
    scene,
    camera
  );
}

updateAllUI();

requestAnimationFrame(
  animate
);