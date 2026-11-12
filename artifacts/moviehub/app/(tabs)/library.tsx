import React,{useCallback,useEffect,useState}from'react';
import{Alert,Image,Platform,Pressable,ScrollView,Text,View}from'react-native';
import{useRouter}from'expo-router';
import AsyncStorage from'@react-native-async-storage/async-storage';
import*as DocumentPicker from'expo-document-picker';
import*as FS from'expo-file-system/legacy';
import{Ionicons}from'@expo/vector-icons';
import{useColors}from'@/hooks/useColors';
import{useFavorites}from'@/lib/Favorites';
import{Empty,Poster}from'@/lib/ui';
type LocalVideo={id:string;name:string;uri:string};
const KEY='moviehub-local-videos-v1';
export default function Library(){
 const c=useColors(),r=useRouter();const fav=useFavorites();
 const[videos,setVideos]=useState<LocalVideo[]>([]),[tab,setTab]=useState<'saved'|'device'>('saved'),[busy,setBusy]=useState(false);
 useEffect(()=>{void AsyncStorage.getItem(KEY).then(x=>{if(x)setVideos(JSON.parse(x));}).catch(()=>{});},[]);
 const persist=useCallback((x:LocalVideo[])=>{setVideos(x);void AsyncStorage.setItem(KEY,JSON.stringify(x));},[]);
 const pick=async()=>{
  if(Platform.OS==='web'){Alert.alert('Use an Android device','Local video files can be selected in the Android app.');return;}
  setBusy(true);
  try{const x=await DocumentPicker.getDocumentAsync({type:['video/*'],copyToCacheDirectory:true,multiple:false});if(x.canceled)return;
   const a=x.assets[0],name=a.name.replace(/[^a-z0-9._-]/gi,'-');
   const target=(FS.documentDirectory||'')+`local-${Date.now()}-${name}`;
   await FS.copyAsync({from:a.uri,to:target});
   const record={id:Date.now().toString(),name:a.name,uri:target};
   persist([record,...videos.filter(v=>v.uri!==target)]);
  }catch(e:any){Alert.alert('Could not add this video',e.message||'Choose a different video file.');}
  finally{setBusy(false);}
 };
 const remove=async(v:LocalVideo)=>Alert.alert('Remove local video?',`${v.name} will be removed from your Moviehub library.`,[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{try{await FS.deleteAsync(v.uri,{idempotent:true});}catch{}persist(videos.filter(x=>x.id!==v.id));}}]);
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{padding:20,paddingTop:60,paddingBottom:110}}>
  <Text style={{fontFamily:'Syne_700Bold',fontSize:28,color:c.foreground}}>My library</Text><Text style={{color:c.mutedForeground,marginTop:4}}>Your saved films and videos on this device.</Text>
  <View style={{flexDirection:'row',backgroundColor:c.card,borderRadius:13,padding:4,marginTop:20}}>{(['saved','device'] as const).map(x=><Pressable key={x} onPress={()=>setTab(x)} style={{flex:1,alignItems:'center',padding:10,borderRadius:10,backgroundColor:tab===x?c.secondary:'transparent'}}><Text style={{color:tab===x?c.foreground:c.mutedForeground,fontFamily:'Inter_600SemiBold'}}>{x==='saved'?'Favourites':'On this device'}</Text></Pressable>)}</View>
  <Pressable onPress={()=>void pick()} disabled={busy} testID="pick-local-video" style={{flexDirection:'row',justifyContent:'center',gap:9,alignItems:'center',padding:14,backgroundColor:c.primary,borderRadius:14,marginTop:17,opacity:busy?.7:1}}><Ionicons name="folder-open-outline" size={19} color="white"/><Text style={{color:'white',fontFamily:'Inter_700Bold'}}>{busy?'Opening files…':'Choose a video file'}</Text></Pressable>
  <Text style={{color:c.mutedForeground,fontSize:12,lineHeight:18,marginTop:9}}>Android will ask which video you want to open. Moviehub only reads files you select.</Text>
  {tab==='saved'?fav.items.length?<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:23}}>{fav.items.map(m=><Poster key={m.subjectId} movie={m} width={142} onPress={()=>r.push({pathname:'/movie',params:{id:String(m.subjectId)}})}/>)}</View>:<Empty icon="heart-outline" title="Keep your next watch close" subtitle="Save a film from its details page and it will appear here."/>:
   videos.length?<View style={{marginTop:17,gap:9}}>{videos.map(v=><View key={v.id} style={{flexDirection:'row',alignItems:'center',padding:12,borderRadius:15,backgroundColor:c.card,gap:12}}><Pressable onPress={()=>r.push({pathname:'/player',params:{title:v.name,url:v.uri,local:'1'}})} style={{width:56,height:60,borderRadius:10,backgroundColor:c.secondary,alignItems:'center',justifyContent:'center'}}><Ionicons name="play" size={22} color={c.primary}/></Pressable><Pressable onPress={()=>r.push({pathname:'/player',params:{title:v.name,url:v.uri,local:'1'}})} style={{flex:1}}><Text numberOfLines={2} style={{color:c.foreground,fontFamily:'Inter_600SemiBold'}}>{v.name}</Text><Text style={{color:c.mutedForeground,marginTop:5,fontSize:12}}>On this device</Text></Pressable><Pressable onPress={()=>void remove(v)} accessibilityLabel="Remove local video" style={{padding:8}}><Ionicons name="trash-outline" size={18} color={c.mutedForeground}/></Pressable></View>)}</View>:<Empty icon="folder-open-outline" title="Your device, your picks" subtitle="Choose a video from your phone. It stays in your local library until you remove it."/>}
 </ScrollView>;
}
