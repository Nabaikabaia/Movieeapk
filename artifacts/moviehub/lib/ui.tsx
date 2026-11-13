import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import type { Movie } from './providers';

export function Poster({ movie, width = 140, onPress }: { movie: Movie; width?: number; onPress: () => void }) {
  const c=useColors();const image=movie.cover?.url||movie.coverUrl||movie.poster;
  return <Animated.View entering={FadeInDown.duration(320)}><Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${movie.title}`} testID={`poster-${movie.subjectId}`} style={({pressed})=>({width,marginRight:13,opacity:pressed?.84:1,transform:[{scale:pressed?.97:1}]})}>
    <View style={{width,height:width*1.43,borderRadius:14,backgroundColor:c.card,overflow:'hidden'}}>
      {image?<Image source={{uri:image}} contentFit="cover" cachePolicy="disk" transition={220} style={{width:'100%',height:'100%'}}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Ionicons name="film-outline" size={29} color={c.mutedForeground}/></View>}
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
      <Text style={{fontSize:19,color:c.foreground,fontFamily:'Outfit_700Bold'}}>{title}</Text>
      {action&&<Pressable onPress={action}><Text style={{color:c.primary,fontFamily:'Inter_600SemiBold'}}>See all</Text></Pressable>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20}}>{items.map((m,i)=><Poster key={m.subjectId||String(i)} movie={m} onPress={()=>onMovie(m)}/>)}</ScrollView>
  </View>;
}

export function Loading({label='Connecting to your movie providers…'}:{label?:string}){
  const c=useColors();
  const travel=useSharedValue(0);
  React.useEffect(()=>{travel.value=withRepeat(withTiming(1,{duration:1250}),-1,false);},[travel]);
  const travelStyle=useAnimatedStyle(()=>({transform:[{translateX:travel.value*158-60}]}));
  return <View style={{flex:1,justifyContent:'center',paddingHorizontal:25,paddingTop:30,paddingBottom:38}}>
    <View style={{alignItems:'center',marginBottom:28}}>
      <NabeesOrbitMark size={82}/>
      <Text style={{color:c.foreground,fontFamily:'Outfit_700Bold',fontSize:18,marginTop:18}}>Setting the scene</Text>
      <Text numberOfLines={2} style={{color:c.mutedForeground,fontSize:11,marginTop:5,textAlign:'center',lineHeight:16}}>{label}</Text>
      <View style={{width:158,height:3,backgroundColor:c.secondary,borderRadius:3,overflow:'hidden',marginTop:19}}>
        <Animated.View style={[travelStyle,{height:3,width:52,backgroundColor:c.primary,borderRadius:3}]}/>
      </View>
    </View>
    <View style={{flexDirection:'row',gap:10,marginTop:3}}>
      {[0,1,2].map((item)=><SkeletonPoster key={item}/>)}
    </View>
  </View>;
}

export function InlineLoader({label}:{label:string}){
  const c=useColors();
  return <View style={{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:10}}>
    <NabeesOrbitMark size={25}/>
    <Text style={{color:c.mutedForeground,fontSize:12,fontFamily:'Outfit_500Medium'}}>{label}</Text>
  </View>;
}

export function NabeesOrbitMark({size=68}:{size?:number}){
  const c=useColors();
  const rotation=useSharedValue(0);
  React.useEffect(()=>{rotation.value=withRepeat(withTiming(360,{duration:2600}),-1,false);},[rotation]);
  const orbit=useAnimatedStyle(()=>({transform:[{rotate:`${rotation.value}deg`}]}));
  const reverseOrbit=useAnimatedStyle(()=>({transform:[{rotate:`${-rotation.value*0.72}deg`}]}));
  const center=Math.max(20,Math.round(size*0.63));
  const ringInset=Math.round(size*0.1);
  return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
    <Animated.View style={[orbit,{position:'absolute',top:1,left:1,right:1,bottom:1,borderRadius:size/2,borderWidth:1,borderStyle:'dashed',borderColor:`${c.primary}70`}]}>
      <View style={{position:'absolute',top:-3,left:'50%',marginLeft:-3,width:6,height:6,borderRadius:3,backgroundColor:c.primary,shadowColor:c.primary,shadowOpacity:.85,shadowRadius:6,elevation:4}}/>
    </Animated.View>
    <Animated.View style={[reverseOrbit,{position:'absolute',top:ringInset,left:ringInset,right:ringInset,bottom:ringInset,borderRadius:size/2,borderWidth:1,borderColor:`${c.primary}48`}]}/>
    <View style={{width:center,height:center,borderRadius:center/2,alignItems:'center',justifyContent:'center',backgroundColor:c.card,borderWidth:1,borderColor:'rgba(255,255,255,.2)',shadowColor:c.primary,shadowOpacity:.28,shadowRadius:13,elevation:6}}>
      <View style={{width:center-10,height:center-10,borderRadius:(center-10)/2,alignItems:'center',justifyContent:'center',backgroundColor:c.primary}}>
        <Text style={{color:c.primaryForeground,fontFamily:'Outfit_800ExtraBold',fontSize:Math.max(12,size*.28),lineHeight:Math.max(14,size*.3)}}>N</Text>
      </View>
    </View>
  </View>;
}

function SkeletonPulse({style}:{style:any}){
  const c=useColors();
  const opacity=useSharedValue(.48);
  React.useEffect(()=>{opacity.value=withRepeat(withTiming(.9,{duration:850}),-1,true);},[opacity]);
  const motion=useAnimatedStyle(()=>({opacity:opacity.value}));
  return <Animated.View style={[{backgroundColor:c.secondary,borderRadius:9},style,motion]}/>;
}

function SkeletonPoster(){
  return <View style={{width:94}}>
    <SkeletonPulse style={{width:94,height:134,borderRadius:13}}/>
    <SkeletonPulse style={{height:9,width:74,marginTop:9}}/>
    <SkeletonPulse style={{height:7,width:48,marginTop:7}}/>
  </View>;
}

export function RailSkeleton({title}:{title:string}){
  const c=useColors();
  return <View style={{marginTop:26}}>
    <Text style={{fontSize:19,color:c.foreground,fontFamily:'Outfit_700Bold',paddingHorizontal:20,marginBottom:14}}>{title}</Text>
    <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:20}}>
      {[0,1,2,3].map((item)=><SkeletonPoster key={item}/>)}
    </ScrollView>
  </View>;
}
export function Problem({message,retry}:{message:string;retry:()=>void}){
  const c=useColors();return <View style={{alignItems:'center',padding:32,marginTop:50}}><Ionicons name="cloud-offline-outline" size={34} color={c.mutedForeground}/><Text style={{color:c.foreground,fontSize:16,fontFamily:'Inter_600SemiBold',marginTop:12}}>Couldn’t load this right now</Text><Text style={{color:c.mutedForeground,textAlign:'center',marginTop:8,lineHeight:20}}>{message}</Text><Pressable onPress={retry} style={{marginTop:18,backgroundColor:c.primary,borderRadius:20,paddingVertical:11,paddingHorizontal:21}}><Text style={{color:'white',fontFamily:'Inter_600SemiBold'}}>Try again</Text></Pressable></View>;
}
export function Empty({icon='film-outline',title,subtitle}:{icon?:any;title:string;subtitle:string}){
 const c=useColors();return <View style={{alignItems:'center',justifyContent:'center',padding:36,marginTop:35}}><Ionicons name={icon} size={34} color={c.mutedForeground}/><Text style={{color:c.foreground,fontSize:17,fontFamily:'Inter_600SemiBold',marginTop:13}}>{title}</Text><Text style={{color:c.mutedForeground,textAlign:'center',marginTop:7,lineHeight:20}}>{subtitle}</Text></View>;
}
