import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Movie} from './providers';
const C=createContext<{items:Movie[];toggle:(m:Movie)=>void}|null>(null),K='moviehub-favorites-v1';
export function FavoritesProvider({children}:{children:React.ReactNode}){
 const [items,setItems]=useState<Movie[]>([]),ready=React.useRef(false);
 useEffect(()=>{void AsyncStorage.getItem(K).then(x=>{if(x)setItems(JSON.parse(x));ready.current=true;}).catch(()=>{ready.current=true;});},[]);
 useEffect(()=>{if(ready.current)void AsyncStorage.setItem(K,JSON.stringify(items));},[items]);
 const toggle=useCallback((m:Movie)=>setItems(v=>v.some(x=>x.subjectId===m.subjectId)?v.filter(x=>x.subjectId!==m.subjectId):[m,...v]),[]);
 const value=useMemo(()=>({items,toggle}),[items,toggle]);
 return <C.Provider value={value}>{children}</C.Provider>;
}
export const useFavorites=()=>{const x=useContext(C);if(!x)throw new Error('FavoritesProvider missing');return x;};
