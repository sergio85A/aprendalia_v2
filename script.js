const PASS = 'Diciembre2025';
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyJwIIgGHu0YETp--1SdOT88BUNVIa-V5J0d1gwDExrR9VJ2mRUAE7h4oAUW2T5pNKMEA/exec"; // URL del Apps Script
let questions=[], queue=[], current, score=0;
let subjectSelected='';
let orderSelection=[];
let preguntaActual = null;
let usuarioActual = null;

function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
}

function login(){
  const name = document.getElementById('name').value.trim();
  usuarioActual = name
  subjectSelected = "Lengua" //document.getElementById('subject').value;

  if(!name){ alert('Introduce tu nombre'); return; }
  if(!subjectSelected){ alert('Elige una asignatura'); return; }

  if(document.getElementById('pass').value===PASS){
    document.getElementById('welcome').style.display='none';
    document.getElementById('game').style.display='block';
    startGame();
  }else{
    alert('Contraseña incorrecta');
  }
}

async function startGame(){
  const r = await fetch('questions.csv');
  const t = await r.text();
  // subjectSelected = document.getElementById('subject').value;

  questions = t.trim().split('\n').slice(1).map(l=>{
    const [id,asignatura,tipo,pregunta,opciones,respuesta,extra] = l.split(';');
    return {id,asignatura,tipo,pregunta,opciones,respuesta,extra};
  });

  // 🔹 FILTRAR POR ASIGNATURA
  queue = questions.filter(q=>q.asignatura===subjectSelected);

  // 🔹 ORDEN ALEATORIO
  shuffle(queue);

  nextQ();
}

function nextQ(){
  const q=document.getElementById('question');
  const a=document.getElementById('answers');
  const f=document.getElementById('feedback');
  const n=document.getElementById('next');
  const w=document.getElementById('writeAnswer');
  const c=document.getElementById('checkBtn');


  a.innerHTML='';
  f.innerText='';
  n.style.display='none';
  w.style.display='none';
  c.style.display='none';

  if(!queue.length){
    q.innerText='🎉 ¡Asignatura terminada!';
    return;
  }

  current = queue.shift();
  q.innerText=current.pregunta;
  // Variable global para observabilidad
  preguntaActual = current;

  if(current.extra){
    f.innerText='💡 Pista: '+current.extra;
  }

  if(current.tipo==='escribir'){
    w.value='';
    w.style.display='block';
    c.style.display='block';
  }
  else if(current.tipo==='ordenar'){
    renderOrder();
  }
  else if(current.tipo==='arrastrar'){
    renderDrag();
  }
  else{
    current.opciones.split('|').forEach(o=>{
      const b=document.createElement('button');
      b.innerText=o;
      b.onclick=()=>finish(normalize(o)===normalize(current.respuesta));
      a.appendChild(b);
    });
  }
}

function normalize(t){ return t.trim().toLowerCase(); }

function checkWrite(){
  finish(normalize(document.getElementById('writeAnswer').value)
        === normalize(current.respuesta));
}

function finish(ok){
  const f=document.getElementById('feedback');
  const n=document.getElementById('next');

  if(ok){
    f.innerText='🌟 ¡Muy bien!';
    // Inicio observabilidad
    console.log("Registrando observabilidad")
    registrarEvento("Acierto")
    // Fin observabilidad
    score++;
  }else{
    f.innerText='💪 Inténtalo otra vez';
    // Inicio poner solucion
    document.getElementById("solucion").innerText =
      "Solución: " + preguntaActual.respuesta_correcta;
    document.getElementById("solucion").style.display = "block";
    // Fin poner solucion
    // Inicio observabilidad
    console.log("Registrando observabilidad")
    registrarEvento("Error")
    // Fin observabilidad
    queue.push(current);
  }
  document.getElementById('score').innerText='Puntos: '+score;
  n.style.display='block';
}

//// ORDENAR ////
let touchItems = [];

function renderOrder(){
  const a = document.getElementById('answers');
  a.innerHTML = '';
  touchItems = [];

  const info = document.createElement('div');
  info.innerText = '👉 Arrastra arriba o abajo para ordenar:';
  a.appendChild(info);

  const list = document.createElement('div');
  list.id = 'orderList';
  list.style.border = '2px dashed #999';
  list.style.padding = '10px';

  const items = current.opciones.split('|').sort(()=>Math.random()-0.5);

  items.forEach(text=>{
    const el = document.createElement('div');
    el.innerText = text;
    el.style.padding = '10px';
    el.style.margin = '5px';
    el.style.background = '#f0f8ff';
    el.style.border = '1px solid #333';
    el.style.touchAction = 'none';

    enableTouchReorder(el, list);
    list.appendChild(el);
    touchItems.push(el);
  });

  a.appendChild(list);

  const resetBtn = document.createElement('button');
  resetBtn.innerText = '🔄 Empezar de nuevo';
  resetBtn.onclick = renderOrder;
  a.appendChild(resetBtn);

  const checkBtn = document.createElement('button');
  checkBtn.innerText = '✅ Comprobar';
  checkBtn.onclick = checkOrderTouch;
  a.appendChild(checkBtn);
}

// FUNCIÓN PARA CALCULAR POSICIÓN
function getDragAfterElement(container, y){
  const els = [...container.querySelectorAll('div:not(.dragging)')];

  return els.reduce((closest, child)=>{
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height/2;

    if(offset < 0 && offset > closest.offset){
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// LOGICA TACTIL
function enableTouchReorder(item, container){
  let startY = 0;
  let currentY = 0;

  item.addEventListener('touchstart', e=>{
    startY = e.touches[0].clientY;
    item.classList.add('moving');
  });

  item.addEventListener('touchmove', e=>{
    currentY = e.touches[0].clientY;
    const dy = currentY - startY;

    item.style.transform = `translateY(${dy}px)`;

    const siblings = [...container.children].filter(c=>c!==item);
    siblings.forEach(sib=>{
      const box = sib.getBoundingClientRect();
      if(currentY > box.top && currentY < box.bottom){
        if(dy > 0){
          container.insertBefore(item, sib.nextSibling);
        }else{
          container.insertBefore(item, sib);
        }
      }
    });
  });

  item.addEventListener('touchend', ()=>{
    item.style.transform = '';
    item.classList.remove('moving');
  });
}

// COMPROBAR ORDEN
function checkOrderTouch(){
  const items = [...document.querySelectorAll('#orderList div')]
    .map(d=>normalize(d.innerText));

  const correct = current.respuesta.split('|').map(normalize);

  if(JSON.stringify(items) === JSON.stringify(correct)){
    document.getElementById('feedback').innerText = '🌟 ¡Perfecto!';
    // Inicio observabilidad
    console.log("Registrando observabilidad")
    registrarEvento("Acierto")
    // Fin observabilidad
    score++;
    document.getElementById('score').innerText = 'Puntos: '+score;
    document.getElementById('next').style.display = 'block';
  }else{
    document.getElementById('feedback').innerText =
      '❌ No es correcto, prueba otra vez';
    // Inicio poner solucion
    document.getElementById("solucion").innerText =
      "Solución: " + preguntaActual.respuesta_correcta;
    document.getElementById("solucion").style.display = "block";
    // Fin poner solucion
    // Inicio observabilidad
    console.log("Registrando observabilidad")
    registrarEvento("Error")
    // Fin observabilidad
  }
}

//// ARRASTRAR ////
let selectedLeft = null;

function renderDrag(){
  const a = document.getElementById('answers');
  a.innerHTML = '';
  selectedLeft = null;

  const left = current.opciones.split('|');
  const right = current.respuesta.split('|').sort(()=>Math.random()-0.5);

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.gap = '30px';

  const L = document.createElement('div');
  const R = document.createElement('div');

  left.forEach(t=>{
    const d = document.createElement('div');
    d.innerText = t;
    d.style.padding = '10px';
    d.style.border = '1px solid black';
    d.onclick = ()=>{
      selectedLeft = d;
      highlight(d, L);
    };
    L.appendChild(d);
  });

  right.forEach(t=>{
    const d = document.createElement('div');
    d.innerText = t;
    d.style.padding = '10px';
    d.style.border = '1px solid black';
    d.onclick = ()=>{
      if(!selectedLeft) return;

      const i = left.indexOf(selectedLeft.innerText);
      const correct = current.respuesta.split('|')[i] === t;

      if(correct){
        // ✔️ ACIERTO
        d.style.background = 'lightgreen';
        selectedLeft.style.display = 'none';
        d.setAttribute('data-ok','1');
        // Inicio observabilidad
        console.log("Registrando observabilidad")
        registrarEvento("Acierto")
        // Fin observabilidad
      }else{
        // ❌ ERROR → NO se elimina nada
        d.style.background = 'lightcoral';
        setTimeout(()=>{
          d.style.background = '';
        }, 800);
        // Inicio observabilidad
        console.log("Registrando observabilidad")
        registrarEvento("Error")
        // Fin observabilidad
        // Inicio poner solucion
        // No tiene sentido aqui;
        // Fin poner solucion
      }

      selectedLeft = null;

      // ¿Hemos terminado todos?
      const total = left.length;
      const done = document.querySelectorAll('[data-ok]').length;

      if(done === total){
        document.getElementById('feedback').innerText = '🌟 ¡Muy bien!';
        // Inicio observabilidad
        console.log("Registrando observabilidad")
        registrarEvento("Acierto")
        // Fin observabilidad
        score++;
        document.getElementById('score').innerText = 'Puntos: '+score;
        document.getElementById('next').style.display = 'block';
      }else{
        // Inicio observabilidad
        console.log("Registrando observabilidad")
        registrarEvento("Error")
        // Fin observabilidad
      }
    };
    R.appendChild(d);
  });

  wrap.appendChild(L);
  wrap.appendChild(R);
  a.appendChild(wrap);
}

function highlight(el, container){
  [...container.children].forEach(c=>c.style.background='');
  el.style.background = '#d0ebff';
}

// Función para enviar observabilidad
function registrarEvento(correcto) {
  enviarObservabilidad(correcto);
}

function enviarObservabilidad(resultado) {
  const formData = new FormData();
  formData.append("fecha", new Date().toISOString());
  formData.append("alumno", usuarioActual);
  formData.append("asignatura", preguntaActual.asignatura);
  formData.append("id_pregunta", preguntaActual.id);
  formData.append("tipo_pregunta", preguntaActual.tipo);
  formData.append("estado", resultado);

  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: formData
  });
}

// reportar pregunta confusa
function reportar() {
  // Inicio observabilidad
  console.log("Registrando observabilidad")
  registrarEvento("Confusa")
  // Fin observabilidad
}
