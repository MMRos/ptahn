import React, { useState } from 'react';
import './home.css';

export default function SearchBar({ onSearch }){
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('relevance');
  const [nsfw, setNsfw] = useState(false);

  const submit = (e)=>{
    e && e.preventDefault();
    onSearch({ q, category, sort, nsfw });
  }

  return (
    <form className="search-bar" onSubmit={submit}>
      <input placeholder="Buscar escenarios..." value={q} onChange={e=>setQ(e.target.value)} />
      <select value={category} onChange={e=>setCategory(e.target.value)}>
        <option value="">Todas</option>
        <option value="Aventura">Aventura</option>
        <option value="Comedia">Comedia</option>
        <option value="Terror">Terror</option>
        <option value="Drama">Drama</option>
        <option value="Ciencia ficción">Ciencia ficción</option>
        <option value="Misterio">Misterio</option>
      </select>
      <select value={sort} onChange={e=>setSort(e.target.value)}>
        <option value="relevance">Relevancia</option>
        <option value="recent">Reciente</option>
        <option value="popular">Popularidad</option>
      </select>
      <label className="nsfw-toggle">NSFW <input type="checkbox" checked={nsfw} onChange={e=>setNsfw(e.target.checked)} />
      </label>
      <button type="submit">Buscar</button>
    </form>
  )
}
