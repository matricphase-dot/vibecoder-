import { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config';

const EXT_COLORS = {
  '.py':'#3B82F6','.js':'#EAB308','.jsx':'#F59E0B','.ts':'#2563EB','.tsx':'#3B82F6',
  '.html':'#EA580C','.css':'#7C3AED','.json':'#6B7280','.md':'#8B5CF6',
  '.rs':'#D97706','.go':'#14B8A6','.java':'#DC2626','.swift':'#F97316',
  '.sh':'#16A34A','.sql':'#2563EB','.yaml':'#7C3AED','.toml':'#D97706',
};

function FileIcon({ ext }) {
  const color = EXT_COLORS[ext] || '#6B7280';
  return <span style={{color, fontWeight:700, fontSize:10, fontFamily:'monospace',
    padding:'1px 4px', borderRadius:3, background:color+'20'}}>{ext||'?'}</span>;
}

function TreeNode({ node, depth=0, onFileClick, onContextMenu }) {
  const [open, setOpen] = useState(depth < 1);
  const indent = depth * 16;
  if (node.type === 'directory') {
    return (
      <div>
        <div onClick={() => setOpen(!open)}
          style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',
            paddingLeft:8+indent,cursor:'pointer',fontSize:12,color:'#E5E7EB',
            borderRadius:4,userSelect:'none'}}
          onContextMenu={e => onContextMenu(e, node)}
          className='hover:bg-white/5'>
          <span style={{fontSize:10}}>{open ? '▼' : '▶'}</span>
          <span>📁</span>
          <span style={{fontWeight:500}}>{node.name}</span>
          {node.children.length > 0 && <span style={{fontSize:10,color:'#6B7280'}}>({node.children.length})</span>}
        </div>
        {open && node.children.map((child,i) => (
          <TreeNode key={i} node={child} depth={depth+1}
            onFileClick={onFileClick} onContextMenu={onContextMenu}/>
        ))}
      </div>
    );
  }
  return (
    <div onClick={() => onFileClick(node)}
      onContextMenu={e => onContextMenu(e, node)}
      style={{display:'flex',alignItems:'center',gap:6,padding:'3px 8px',
        paddingLeft:8+indent,cursor:'pointer',fontSize:12,color:'#D1D5DB',borderRadius:4}}
      className='hover:bg-white/5'>
      <FileIcon ext={node.extension}/>
      <span className='truncate'>{node.name}</span>
      <span style={{marginLeft:'auto',fontSize:10,color:'#4B5563'}}>
        {node.size > 1024 ? `${(node.size/1024).toFixed(0)}k` : `${node.size}b`}
      </span>
    </div>
  );
}

export default function FileBrowser({ onFileOpen }) {
  const [path, setPath] = useState('');
  const [inputPath, setInputPath] = useState('');
  const [tree, setTree] = useState(null);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(apiUrl('/system/drives')).then(r => r.json()).then(setDrives).catch(console.error);
  }, []);

  const browse = async (p) => {
    if (!p) return;
    setLoading(true); setError('');
    try {
      const r = await fetch(apiUrl('/system/browse'), {method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({path:p,max_depth:3})});
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setTree(data); setPath(p); setInputPath(p);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleFileClick = async (node) => {
    try {
      const r = await fetch(apiUrl('/system/read'),{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({path:node.path})});
      const data = await r.json();
      onFileOpen(node.path, data.content);
    } catch(e) { alert('Could not read file: ' + e.message); }
  };

  const closeCtx = () => setCtxMenu(null);

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',
      background:'#0C0B10',color:'#E5E7EB',fontSize:12}} onClick={closeCtx}>

      <div style={{padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,.07)',
        display:'flex',gap:6,alignItems:'center'}}>
        <input value={inputPath} onChange={e=>setInputPath(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&browse(inputPath)}
          placeholder='Enter path...'
          style={{flex:1,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',
            borderRadius:6,padding:'4px 8px',color:'#E5E7EB',fontSize:12,fontFamily:'monospace'}}/>
        <button onClick={()=>browse(inputPath)}
          style={{background:'#1D4ED8',border:'none',color:'white',padding:'4px 10px',
            borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>Go</button>
        <button onClick={()=>browse(require('os').homedir?.() || '/')}
          style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',
            color:'#9CA3AF',padding:'4px 8px',borderRadius:6,cursor:'pointer',fontSize:11}}>🏠</button>
      </div>

      {drives.length > 0 && (
        <div style={{padding:'6px 10px',borderBottom:'1px solid rgba(255,255,255,.07)',
          display:'flex',gap:4,flexWrap:'wrap'}}>
          {drives.map((d,i)=>(
            <button key={i} onClick={()=>browse(d.path)}
              style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',
                color:'#9CA3AF',padding:'2px 8px',borderRadius:4,cursor:'pointer',fontSize:10}}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div style={{padding:'6px 10px',borderBottom:'1px solid rgba(255,255,255,.07)'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder='Filter files...'
          style={{width:'100%',background:'rgba(255,255,255,.04)',
            border:'1px solid rgba(255,255,255,.08)',borderRadius:5,
            padding:'3px 8px',color:'#D1D5DB',fontSize:11}}/>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'4px 0'}}>
        {loading && <div style={{padding:12,color:'#6B7280',textAlign:'center'}}>Loading...</div>}
        {error && <div style={{padding:12,color:'#EF4444',fontSize:11}}>{error}</div>}
        {!loading && !tree && !error && (
          <div style={{padding:12,color:'#4B5563',textAlign:'center',lineHeight:1.8}}>
            <div style={{fontSize:24,marginBottom:6}}>📂</div>
            <div>Enter a path above to browse</div>
            <div style={{fontSize:10,marginTop:4}}>or click a drive button</div>
          </div>
        )}
        {tree && <TreeNode node={tree} onFileClick={handleFileClick}
          onContextMenu={(e,n)=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,node:n})}}/>}
      </div>

      {ctxMenu && (
        <div style={{position:'fixed',top:ctxMenu.y,left:ctxMenu.x,
          background:'#1F2937',border:'1px solid rgba(255,255,255,.12)',
          borderRadius:8,zIndex:1000,minWidth:140,boxShadow:'0 8px 24px rgba(0,0,0,.4)'}}
          onClick={e=>e.stopPropagation()}>
          {ctxMenu.node.type==='file'&&[
            ['Open in editor', ()=>{handleFileClick(ctxMenu.node);closeCtx();}],
            ['Copy path', ()=>{navigator.clipboard.writeText(ctxMenu.node.path);closeCtx();}],
            ['Delete', async()=>{if(confirm('Delete '+ctxMenu.node.name+'?')){
              await fetch(apiUrl('/system/delete'),{method:'POST',
              headers:{'Content-Type':'application/json'},body:JSON.stringify({path:ctxMenu.node.path})});
              browse(path);closeCtx();}}],
          ].map(([label,fn],i)=>(
            <div key={i} onClick={fn}
              style={{padding:'8px 14px',cursor:'pointer',fontSize:12,color:'#D1D5DB'}}
              className='hover:bg-white/10'>{label}</div>
          ))}
        </div>
      )}
    </div>
  );
}
