let pyodidePromise;
async function getPyodide(){
  if(!pyodidePromise){
    pyodidePromise=(async()=>{
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');
      return await loadPyodide();
    })();
  }
  return pyodidePromise;
}
self.onmessage=async(event)=>{
  const {code,language,input}=event.data;
  try{
    let result;
    if(language==='python'){
      const py=await getPyodide();
      py.globals.set('challenge_input_json',JSON.stringify(input));
      const wrapped=`import json\nchallenge_input = json.loads(challenge_input_json)\n${code}\n_result = solve(challenge_input)\njson.dumps(_result, separators=(',', ':'))`;
      const raw=await py.runPythonAsync(wrapped);
      result=JSON.parse(raw);
    }else{
      const runner=new Function('input',`"use strict";\n${code}\nif (typeof solve !== "function") throw new Error("Please define a function named solve(input).");\nreturn solve(input);`);
      result=runner(input);
    }
    self.postMessage({ok:true,result});
  }catch(error){self.postMessage({ok:false,error:String(error&&error.message||error)});}
};