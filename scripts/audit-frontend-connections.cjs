/* Static evidence: direct Axios calls and literal navigation targets. Dynamic runtime behavior needs E2E checks. */
const fs = require('fs');
const path = require('path');
const ts = require('../frontend/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const files = [];
function walk(dir) { for (const e of fs.readdirSync(dir, {withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(/\.tsx?$/.test(p)) files.push(p); } }
walk(path.join(root,'frontend/src'));
const calls=[], routes=new Set(), targets=[];
function str(n) { if(!n)return null; if(ts.isStringLiteralLike(n))return n.text; if(ts.isTemplateExpression(n))return n.head.text+n.templateSpans.map(x=>'{param}'+x.literal.text).join(''); return null; }
for(const file of files) {
 const src=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 function visit(n) {
  const location={file:path.relative(root,file),line:src.getLineAndCharacterOfPosition(n.getStart()).line+1};
  if(ts.isCallExpression(n)){
   if(ts.isPropertyAccessExpression(n.expression)&&['apiClient','axiosClient'].includes(n.expression.expression.getText(src))){
    const method=n.expression.name.text.toUpperCase(),url=str(n.arguments[0]);
    if(url&&['GET','POST','PUT','PATCH','DELETE'].includes(method))calls.push({...location,method,url});
   }
   if(n.expression.getText(src)==='navigate'){const url=str(n.arguments[0]);if(url?.startsWith('/')&&!url.includes('{param}'))targets.push({...location,url});}
  }
  if(file.endsWith('App.tsx')&&ts.isPropertyAssignment(n)&&n.name.getText(src)==='path'){const v=str(n.initializer);if(v)routes.add('/'+v.replace(/^\//,''));}
  if(ts.isJsxAttribute(n)&&n.name.getText(src)==='to'){
   const url=str(n.initializer);if(url?.startsWith('/'))targets.push({...location,url});
  }
  ts.forEachChild(n,visit);
 }
 visit(src);
}
const missingRoutes=targets.filter(t=>!routes.has(t.url.split('?')[0]));
const result={calls,routeTargets:targets.length,missingRoutes};
fs.mkdirSync(path.join(root,'backend/scratch'),{recursive:true});
fs.writeFileSync(path.join(root,'backend/scratch/frontend-api-calls.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({apiCalls:calls.length,routeTargets:targets.length,missingRoutes},null,2));
if(missingRoutes.length)process.exitCode=1;
