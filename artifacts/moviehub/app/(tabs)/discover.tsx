import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {useQuery} from '@tanstack/react-query';
import {Ionicons} from '@expo/vector-icons';
import {useColors} from '@/hooks/useColors';
import {findMovies,getMovies} from '@/lib/providers';
import {Loading,Problem,Poster,Empty} from '@/lib/ui';
const categories=[['Top Trending','top-list'],['Popular Movies','popular'],['New TV','new-tv'],['Returning TV','returning-tv'],['Anime','anime'],['Nollywood','nollywood'],['Black Drama','black-drama'],['K-Drama','k-drama'],['South African','sa-drama'],['Bollywood','bollywood'],['Animation','animation'],['Chinese Drama','c-drama'],['Thai Drama','thai-drama'],['Showmax','showmax'],['Turkish','turkish'],['South Indian','indian']] as const;
export default function Discover(){
 const c=useColors(),r=useRouter();const [selected,setSelected]=useState('popular'),[term,setTerm]=useState('');
 const q=useQuery({queryKey:['category',selected],queryFn:()=>getMovies(selected),staleTime:240000});
 const s=useQuery({queryKey:['search',term],queryFn:()=>findMovies(term),enabled:term.trim().length>1});
 const list=term.trim().length>1?s.data:q.data;
 return <ScrollView style={{flex:1,backgroundColor:c.background}} contentContainerStyle={{paddingTop:60,paddingBottom:35}}>
  <Text style={{fontFamily:'Syne_700Bold',fontSize:29,color:c.foreground,paddingHorizontal:20}}>Discover</Text>
  <Text style={{color:c.mutedForeground,marginTop:5,paddingHorizontal:20}}>Find something worth staying in for.</Text>
  <Pressable onPress={()=>r.push('/search')} style={{marginHorizontal:20,marginTop:20,borderRadius:15,backgroundColor:c.card,padding:15,flexDirection:'row',gap:11,alignItems:'center'}}><Ionicons name="search" size={19} color={c.mutedForeground}/><Text style={{color:c.mutedForeground}}>Search movies and series</Text></Pressable>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20,gap:9,marginTop:19}}>{categories.map(([label,slug])=><Pressable key={slug} onPress={()=>{setSelected(slug);setTerm('');}} style={{backgroundColor:selected===slug?c.primary:c.card,borderRadius:20,paddingHorizontal:15,paddingVertical:10}}><Text style={{color:'white',fontFamily:'Inter_600SemiBold',fontSize:12}}>{label}</Text></Pressable>)}</ScrollView>
  {q.isLoading&&<Loading/>}{q.isError&&<Problem message={q.error.message} retry={()=>void q.refetch()}/>}
  {list?.length? <View style={{paddingHorizontal:20,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginTop:25}}>{list.map((m:any)=><Poster key={m.subjectId} movie={m} width={((require('react-native').Dimensions.get('window').width)-58)/2.55} onPress={()=>r.push({pathname:'/movie',params:{id:String(m.subjectId)}})}/>)}</View>:!q.isLoading&&!q.isError?<Empty title="Nothing to show yet" subtitle={term?'Try a different search.':'Check back in a moment for fresh picks.'}/>:null}
 </ScrollView>;
}
