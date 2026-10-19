const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','www');
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404,{'cache-control':'no-store'});r.end();return}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});r.end(d)})}).listen(process.env.PORT||5173,()=>console.log('http://localhost:'+(process.env.PORT||5173)));
