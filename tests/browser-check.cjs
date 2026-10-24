// Optional local Chrome verification. No browser packages or application server needed.
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path'),assert=require('assert');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
const chrome=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+path.join(__dirname,'.browser-check-profile'),'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,seq=0;
const pending=new Map(),errors=[];
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
  const endpoint=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome startup timeout')),15000);child.on('error',reject);child.stderr.on('data',chunk=>{const match=String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  const origin=endpoint.replace('ws:','http:').split('/devtools/')[0];
  const targets=await (await fetch(origin+'/json/list')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const item=pending.get(msg.id);if(item){pending.delete(msg.id);if(msg.error)item.reject(new Error(msg.error.message));else item.resolve(msg.result);}}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);};
  await send('Runtime.enable');await send('Page.enable');
  for(const [name,width,height] of [['desktop',1440,1100],['mobile',390,844]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:name==='mobile'});
    await send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href});await delay(700);
    const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true})).result.value;
    assert.equal(await evaluate('document.body.dataset.theme'),'kopitiam');
    const size=await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth})');assert(size.page<=size.viewport,`${name} horizontal overflow: ${JSON.stringify(size)}`);
    assert.equal(await evaluate('document.querySelectorAll(".food-row").length'),35);
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(__dirname,name+'.png'),Buffer.from(screenshot.data,'base64'));
    for(const theme of ['cute','midnight','minimal','kopitiam']){await evaluate(`document.getElementById('theme').value='${theme}';document.getElementById('theme').dispatchEvent(new Event('change'));`);assert.equal(await evaluate('document.body.dataset.theme'),theme);}
    await evaluate("document.getElementById('clear-all').click()");assert.equal(await evaluate("document.getElementById('spin').disabled"),true);
    await evaluate("document.getElementById('select-all').click()");assert.equal(await evaluate("document.querySelectorAll('.food-row input:checked').length"),35);
    await evaluate("document.getElementById('reset-defaults').click();document.getElementById('confirm-ok').click()");
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS: file:// loads, 1440px desktop / 390px mobile without overflow, logo/screenshots, four themes, checklist controls, no uncaught JavaScript exceptions.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(socket){try{await send('Browser.close');}catch{}socket.close();}child.kill();});
