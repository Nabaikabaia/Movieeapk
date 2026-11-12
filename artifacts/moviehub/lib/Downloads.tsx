import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FS from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import { Alert, Platform } from 'react-native';
import { useUserPreferences } from './UserPreferences';

export type DownloadItem = { id: string; title: string; uri: string; sourceUrl: string; localUri?: string; bytes: number; total: number; state: 'queued'|'downloading'|'paused'|'complete'|'error'; resumeData?: string; error?: string };
type Ctx = { items: DownloadItem[]; canStart:()=>Promise<boolean>; start: (title:string,url:string) => Promise<void>; pause:(id:string)=>Promise<void>; resume:(id:string)=>Promise<void>; remove:(id:string)=>Promise<void>; removeAll:()=>void };
const Context=createContext<Ctx|null>(null), KEY='moviehub-downloads-v1';
export function DownloadsProvider({children}:{children:React.ReactNode}) {
   const { preferences, isReady: preferencesReady } = useUserPreferences();
  const [items,setItems]=useState<DownloadItem[]>([]);
  const tasks=useRef(new Map<string,FS.DownloadResumable>());
  const loaded=useRef(false);
   const blockedAlertShown=useRef(false);
  const replace=useCallback((id:string,fn:(x:DownloadItem)=>DownloadItem)=>setItems(v=>v.map(x=>x.id===id?fn(x):x)),[]);
   const canDownloadNow=useCallback(async()=>{
     if(!preferencesReady){Alert.alert('Settings are still loading','Wait a moment, then try the download again.');return false;}
     if(preferences.downloadNetwork==='any'){blockedAlertShown.current=false;return true;}
     if(Platform.OS==='web'){
       if(!blockedAlertShown.current)Alert.alert('Network restriction unavailable','Choose “Any network” to download from the browser preview.');
       blockedAlertShown.current=true;
       return false;
     }
     try{
       const network=await Network.getNetworkStateAsync();
       const allowed=preferences.downloadNetwork==='wifi'
         ?network.type===Network.NetworkStateType.WIFI
         :network.type===Network.NetworkStateType.CELLULAR;
       if(allowed){blockedAlertShown.current=false;return true;}
       if(!blockedAlertShown.current)Alert.alert(
         preferences.downloadNetwork==='wifi'?'Wi-Fi required':'Mobile data required',
         preferences.downloadNetwork==='wifi'
           ?'This download is set to use Wi-Fi only. Connect to Wi-Fi or change the setting in Me.'
           :'This download is set to use mobile data only. Connect to mobile data or change the setting in Me.',
       );
       blockedAlertShown.current=true;
       return false;
     }catch{
       if(!blockedAlertShown.current)Alert.alert('Network status unavailable','Moviehub could not verify the current connection. Try again or allow downloads on any network.');
       blockedAlertShown.current=true;
       return false;
     }
   },[preferences.downloadNetwork,preferencesReady]);
   const notifyComplete=useCallback(async(title:string)=>{
     if(!preferences.downloadCompleteNotifications||Platform.OS==='web')return;
     try{
       const Notifications=await import('expo-notifications');
       const permission=await Notifications.getPermissionsAsync();
       if(!permission.granted)return;
       await Notifications.scheduleNotificationAsync({
         content:{title:'Download complete',body:`${title} is ready to watch.`,data:{screen:'downloads'}},
         trigger:null,
       });
     }catch{}
   },[preferences.downloadCompleteNotifications]);
   useEffect(()=>{blockedAlertShown.current=false;},[preferences.downloadNetwork]);
  useEffect(()=>{ (async()=>{try{const x=await AsyncStorage.getItem(KEY);if(x){const rows:DownloadItem[]=JSON.parse(x);setItems(rows.map(r=>r.state==='downloading'?{...r,state:'paused'}:r));}}catch{} loaded.current=true;})(); },[]);
  useEffect(()=>{if(loaded.current)void AsyncStorage.setItem(KEY,JSON.stringify(items));},[items]);
  const start=useCallback(async(title:string,url:string)=>{
    if(Platform.OS==='web'){Alert.alert('Use an Android device','Downloads are available in the Android app.');return;}
    if(!url){Alert.alert('No download link','This provider did not supply a downloadable video file.');return;}
    if(/\.m3u8(?:$|\?)/i.test(url)){Alert.alert('Live streams cannot be saved as movie files','This provider supplies an HLS playlist, not a direct downloadable video file.');return;}
     if(!(await canDownloadNow()))return;
    const id=Date.now().toString()+Math.random().toString(36).slice(2,8);
    const file=(title.replace(/[^a-z0-9]+/gi,'-').slice(0,50)||'Movie')+'-'+id+'.mp4';
    const uri=(FS.documentDirectory||'')+file;
    const item:DownloadItem={id,title,uri,sourceUrl:url,bytes:0,total:0,state:'downloading'};
    setItems(v=>[item,...v]);
    const task=FS.createDownloadResumable(url,uri,{},p=>replace(id,x=>({...x,state:'downloading',bytes:p.totalBytesWritten,total:p.totalBytesExpectedToWrite>0?p.totalBytesExpectedToWrite:x.total,resumeData:task.savable().resumeData})));
    tasks.current.set(id,task);
     try{const r=await task.downloadAsync(); if(r?.uri){tasks.current.delete(id); replace(id,x=>({...x,state:'complete',localUri:r.uri,bytes:x.total||x.bytes}));void notifyComplete(title);}}
    catch(e:any){tasks.current.delete(id);if(!String(e?.message||e).toLowerCase().includes('cancel'))replace(id,x=>({...x,state:'error',error:e?.message||'Download failed'}));}
   },[canDownloadNow,notifyComplete,replace]);
  const pause=useCallback(async(id:string)=>{const t=tasks.current.get(id);if(!t)return;try{const saved=await t.pauseAsync();tasks.current.delete(id);replace(id,x=>({...x,state:'paused',resumeData:saved?.resumeData}));}catch(e:any){replace(id,x=>({...x,state:'error',error:e?.message||'Pause failed'}));}},[replace]);
   const resume=useCallback(async(id:string)=>{const item=items.find(x=>x.id===id);if(!item)return;if(Platform.OS==='web')return;if(!(await canDownloadNow()))return;const t=FS.createDownloadResumable(item.sourceUrl,item.uri,{},p=>replace(id,x=>({...x,state:'downloading',bytes:p.totalBytesWritten,total:p.totalBytesExpectedToWrite>0?p.totalBytesExpectedToWrite:x.total,resumeData:t.savable().resumeData})),item.resumeData);tasks.current.set(id,t);replace(id,x=>({...x,state:'downloading',error:undefined}));try{const r=await t.resumeAsync();tasks.current.delete(id);if(r?.uri){replace(id,x=>({...x,state:'complete',localUri:r.uri}));void notifyComplete(item.title);}}catch(e:any){tasks.current.delete(id);replace(id,x=>({...x,state:'error',error:e?.message||'Resume failed'}));}},[canDownloadNow,items,notifyComplete,replace]);
   useEffect(()=>{
     if(Platform.OS==='web'||!preferencesReady||preferences.downloadNetwork==='any')return undefined;
     const enforcePolicy=(network:{type?:Network.NetworkStateType})=>{
       const stillAllowed=preferences.downloadNetwork==='wifi'
         ?network.type===Network.NetworkStateType.WIFI
         :network.type===Network.NetworkStateType.CELLULAR;
       if(!stillAllowed)for(const id of [...tasks.current.keys()])void pause(id);
     };
     void Network.getNetworkStateAsync().then(enforcePolicy).catch(()=>undefined);
     const subscription=Network.addNetworkStateListener(enforcePolicy);
     return()=>subscription.remove();
   },[pause,preferences.downloadNetwork,preferencesReady]);
  const remove=useCallback(async(id:string)=>{const t=tasks.current.get(id);if(t){try{await t.cancelAsync();}catch{}tasks.current.delete(id);}const item=items.find(x=>x.id===id);if(item){try{await FS.deleteAsync(item.localUri||item.uri,{idempotent:true});}catch{}}setItems(v=>v.filter(x=>x.id!==id));},[items]);
  const removeAll=useCallback(()=>Alert.alert('Delete all downloads?','This permanently removes every downloaded video from this app.',[{text:'Cancel',style:'cancel'},{text:'Delete all',style:'destructive',onPress:()=>{void Promise.all(items.map(i=>remove(i.id)));}}]),[items,remove]);
   const value=useMemo(()=>({items,canStart:canDownloadNow,start,pause,resume,remove,removeAll}),[items,canDownloadNow,start,pause,resume,remove,removeAll]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useDownloads=()=>{const c=useContext(Context);if(!c)throw new Error('DownloadsProvider missing');return c;};
export async function saveToDevice(uri:string) {
  if(Platform.OS==='web')return false;
  const permission=await MediaLibrary.requestPermissionsAsync(true,['video']);
  if(!permission.granted)throw new Error('Allow video library access to save this download to the device.');
  await MediaLibrary.createAssetAsync(uri);
  return true;
}
