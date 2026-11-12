import React,{useEffect,useState} from 'react';
import {Keyboard,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';import {useQuery} from '@tanstack/react-query';import {Ionicons} from '@expo/vector-icons';
import {useColors} from '@/hooks/useColors';import {findMovies,getSuggestions} from '@/lib/providers';import {Empty,Poster,Problem} from '@/lib/ui';
export default function Search(){
 const c=useColors(),r=useRouter();const [text,setText]=useState(''),[term,setTerm]=useState('');
 useEffect(()=>{const h=setTimeout(()=>setTerm(text.trim()),350);return()=>clearTimeout(h);},[text]);
 const q=useQuery({queryKey:['search-results',term],queryFn:()=>findMovies(term),enabled:term.length>1});
 const suggest=useQuery({queryKey:['search-suggest',term],queryFn:()=>getSuggestions(term),enabled:term.length>1,staleTime:90000});
 return <View style={{flex:1,backgroundColor:c.background,paddingTop:60}}>
  <Text style={{fontFamily:'Syne_700Bold',fontSize:28,color:c.foreground,paddingHorizontal:20,marginBottom:17}}>Search</Text>
  <View style={{marginHorizontal:20,backgroundColor:c.card,borderRadius:15,flexDirection:'row',alignItems:'center',paddingHorizontal:14}}>
   <Ionicons name="search" size={19} color={c.mutedForeground}/><TextInput autoFocus value={text} onChangeText={setText} returnKeyType="search" placeholder="Movies, shows, favourites…" placeholderTextColor={c.mutedForeground} style={{flex:1,color:c.foreground,paddingVertical:14,paddingHorizontal:11}} testID="movie-search-input"/>
   {!!text&&<Pressable onPress={()=>setText('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={19} color={c.mutedForeground}/></Pressable>}
  </View>
  {term.length>1&&q.isError?<Problem message={q.error.message} retry={()=>void q.refetch()}/>:term.length>1&&q.data?.length?
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'}}>{q.data.map((m:any)=><Poster key={m.subjectId} movie={m} width={135} onPress={()=>{Keyboard.dismiss();r.push({pathname:'/movie',params:{id:String(m.subjectId)}})}}/>)}</ScrollView>:
   term.length>1&&!q.isFetching?<Empty icon="search-outline" title="No matches found" subtitle="Try a different title or spelling."/>:
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20}}>{suggest.data?.map((x:any,i:number)=><Pressable key={x.subjectId||i} onPress={()=>{setText(x.title);Keyboard.dismiss();if(x.subjectId)r.push({pathname:'/movie',params:{id:String(x.subjectId)}})}} style={{paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border,flexDirection:'row',alignItems:'center',gap:12}}><Ionicons name="trending-up" size={18} color={c.primary}/><Text style={{color:c.foreground,flex:1}}>{x.title}</Text><Ionicons name="arrow-up" size={17} color={c.mutedForeground}/></Pressable>)}{term.length<2&&<Empty icon="sparkles-outline" title="A good story is close" subtitle="Search movies and series from the Nabees catalogue."/>}</ScrollView>}
 </View>;
}
