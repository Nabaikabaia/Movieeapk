import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import type { Movie } from './providers';

export function Poster({ movie, width = 140, onPress }: { movie: Movie; width?: number; onPress: () => void }) {
  const c=useColors();const image=movie.cover?.url||movie.coverUrl||movie.poster;
  return <Animated.View entering={FadeInDown.duration(320)}><Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${movie.title}`} testID={`poster-${movie.subjectId}`} style={({pressed})=>({width,marginRight:13,opacity:pressed?.84:1,transform:[{scale:pressed?.97:1}]})}>
    <View style={{width,height:width*1.43,borderRadius:14,backgroundColor:c.card,overflow:'hidden'}}>
      {image?<Image source={{uri:image}} resizeMode="cover" style={{width:'100%',height:'100%'}}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Ionicons name="film-outline" size={29} color={c.mutedForeground}/></View>}
      {!!(movie.imdbRatingValue||movie.rating)&&<View style={{position:'absolute',top:8,left:8,backgroundColor:'rgba(12,13,15,.86)',borderRadius:10,paddingHorizontal:8,paddingVertical:5}}><Text style={{color:c.accent,fontSize:11,fontFamily:'Inter_600SemiBold'}}>★ {movie.imdbRatingValue||movie.rating}</Text></View>}
    </View>
    <Text numberOfLines={2} style={{color:c.foreground,fontSize:13,fontFamily:'Inter_600SemiBold',marginTop:8,lineHeight:18}}>{movie.title}</Text>
    <Text style={{color:c.mutedForeground,fontSize:11,marginTop:3}}>{movie.releaseDate?.slice(0,4)|| (movie.subjectType===2?'Series':'Movie')}</Text>
  </Pressable></Animated.View>;
}

export function Rail({title,items,onMovie,action}:{title:string;items:Movie[];onMovie:(m:Movie)=>void;action?:()=>void}){
  const c=useColors();if(!items.length)return null;
  return <View style={{marginTop:26}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,marginBottom:14}}>
      <Text style={{fontSize:19,color:c.foreground,fontFamily:'Syne_700Bold'}}>{title}</Text>
      {action&&<Pressable onPress={action}><Text style={{color:c.primary,fontFamily:'Inter_600SemiBold'}}>See all</Text></Pressable>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20}}>{items.map((m,i)=><Poster key={m.subjectId||String(i)} movie={m} onPress={()=>onMovie(m)}/>)}</ScrollView>
  </View>;
}

export function Loading({label='Connecting to your movie providers…'}:{label?:string}){
  const c=useColors();return <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:28}}><ActivityIndicator color={c.primary} size="large"/><Text style={{color:c.mutedForeground,marginTop:14,textAlign:'center'}}>{label}</Text></View>;
}
export function Problem({message,retry}:{message:string;retry:()=>void}){
  const c=useColors();return <View style={{alignItems:'center',padding:32,marginTop:50}}><Ionicons name="cloud-offline-outline" size={34} color={c.mutedForeground}/><Text style={{color:c.foreground,fontSize:16,fontFamily:'Inter_600SemiBold',marginTop:12}}>Couldn’t load this right now</Text><Text style={{color:c.mutedForeground,textAlign:'center',marginTop:8,lineHeight:20}}>{message}</Text><Pressable onPress={retry} style={{marginTop:18,backgroundColor:c.primary,borderRadius:20,paddingVertical:11,paddingHorizontal:21}}><Text style={{color:'white',fontFamily:'Inter_600SemiBold'}}>Try again</Text></Pressable></View>;
}
export function Empty({icon='film-outline',title,subtitle}:{icon?:any;title:string;subtitle:string}){
 const c=useColors();return <View style={{alignItems:'center',justifyContent:'center',padding:36,marginTop:35}}><Ionicons name={icon} size={34} color={c.mutedForeground}/><Text style={{color:c.foreground,fontSize:17,fontFamily:'Inter_600SemiBold',marginTop:13}}>{title}</Text><Text style={{color:c.mutedForeground,textAlign:'center',marginTop:7,lineHeight:20}}>{subtitle}</Text></View>;
}
