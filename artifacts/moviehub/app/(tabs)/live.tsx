import React,{useState} from 'react';
import {Image,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';import {useQuery} from '@tanstack/react-query';import {Ionicons} from '@expo/vector-icons';
import {useColors} from '@/hooks/useColors';import {getGlobeChannels,getIptv,getIptvStream,getPluto} from '@/lib/providers';import {Empty,Loading,Problem} from '@/lib/ui';
export default function Live(){
 const c=useColors(),r=useRouter();const [source,setSource]=useState('Pluto TV'),[query,setQuery]=useState('');
 const q=useQuery({queryKey:['live',source,query],queryFn:()=>source==='Pluto TV'?getPluto():source==='IPTV'?getIptv(query):getGlobeChannels(),staleTime:300000});
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingTop:58,paddingBottom:35}}>
  <Text style={{fontFamily:'Syne_700Bold',fontSize:29,color:c.foreground,paddingHorizontal:20}}>Live TV</Text><Text style={{color:c.mutedForeground,marginTop:5,paddingHorizontal:20}}>A world of channels, right now.</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20,gap:9,marginVertical:19}}>{['Pluto TV','GlobeTV','IPTV'].map(x=><Pressable key={x} onPress={()=>setSource(x)} style={{borderRadius:20,backgroundColor:source===x?c.primary:c.card,paddingHorizontal:17,paddingVertical:10}}><Text style={{color:'white',fontFamily:'Inter_600SemiBold'}}>{x}</Text></Pressable>)}</ScrollView>
  {source==='IPTV'&&<TextInput value={query} onChangeText={setQuery} placeholder="Filter channels" placeholderTextColor={c.mutedForeground} style={{marginHorizontal:20,marginBottom:15,backgroundColor:c.card,color:c.foreground,padding:14,borderRadius:13}}/>}
  {q.isLoading&&!q.data&&<Loading label={`Tuning into ${source}…`}/>}
  {q.isError&&<Problem message={q.error.message} retry={()=>void q.refetch()}/>}
  {q.data?.length? <View style={{paddingHorizontal:18}}>{q.data.map((ch:any)=>{const id=String(ch.id||ch.name||'');const url=ch.thumbnail||ch.logo||ch.streams?.[0]?.url||ch.streams?.[0]?.logo;const stream=ch.streams?.[0];return <Pressable key={id} onPress={async()=>{let playUrl=stream?.url||ch.url||'';if(source==='IPTV'&&stream)playUrl=await getIptvStream(stream.url,stream.userAgent,stream.referrer);r.push({pathname:'/player',params:{title:ch.name||ch.title||'Live channel',url:source==='Pluto TV'?'':playUrl,channelId:source==='Pluto TV'?id:'',kind:source}})}} style={{flexDirection:'row',alignItems:'center',padding:13,marginBottom:9,borderRadius:17,backgroundColor:c.card}}>
    {url?.startsWith('http')?<Image source={{uri:url}} resizeMode="contain" style={{width:50,height:50,borderRadius:12,backgroundColor:'#111',marginRight:13}}/>:<View style={{width:50,height:50,borderRadius:12,backgroundColor:c.secondary,alignItems:'center',justifyContent:'center',marginRight:13}}><Ionicons name="tv-outline" size={20} color={c.primary}/></View>}
    <View style={{flex:1}}><Text numberOfLines={1} style={{color:c.foreground,fontFamily:'Inter_600SemiBold',fontSize:14}}>{ch.name||ch.title}</Text><Text numberOfLines={1} style={{color:c.mutedForeground,fontSize:12,marginTop:4}}>{ch.category||ch.country||ch.network||source}</Text></View><Ionicons name="play-circle" size={27} color={c.primary}/>
   </Pressable>})}</View>:!q.isLoading&&!q.isError?<Empty icon="tv-outline" title="No channels available" subtitle="This source has no playable channels right now. Try another provider."/ >:null}
 </ScrollView>;
}
