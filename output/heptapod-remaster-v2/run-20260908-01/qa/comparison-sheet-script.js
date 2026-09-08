
const viewer=document.getElementById('viewer');let opener=null;
document.querySelectorAll('.open-image').forEach(button=>button.addEventListener('click',()=>{opener=button;const source=button.querySelector('img');const target=viewer.querySelector('img');target.src=source.src;target.alt=source.alt;document.getElementById('caption').textContent=source.alt;viewer.querySelector('.image-scroll').classList.remove('actual');document.getElementById('actual').textContent='100%';viewer.showModal();}));
document.querySelector('.close').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>opener?.focus());viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
document.getElementById('actual').addEventListener('click',event=>{const actual=viewer.querySelector('.image-scroll').classList.toggle('actual');event.target.textContent=actual?'화면에 맞춤':'100%';});
document.getElementById('view-toggle').addEventListener('click',event=>{const enabled=document.body.classList.toggle('overlay-mode');event.currentTarget.setAttribute('aria-pressed',String(enabled));event.currentTarget.textContent=enabled?'나란히 보기':'겹쳐 보기';});
document.querySelectorAll('input[type=range]').forEach(input=>input.addEventListener('input',()=>{input.closest('.overlap').querySelector('.candidate').style.opacity=Number(input.value)/100;}));
document.getElementById('print').addEventListener('click',()=>window.print());
