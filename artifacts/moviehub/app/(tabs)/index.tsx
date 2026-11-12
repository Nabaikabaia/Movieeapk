import React,{useMemo} from 'react';
import {ImageBackground,Pressable,RefreshControl,ScrollView,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons} from '@expo/vector-icons';
import {useQuery} from '@tanstack/react-query';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useColors} from '@/hooks/useColors';
import {getHome} from '@/lib/providers';
import {Loading,Problem,Rail} from '@/lib/ui';

export default function Home(){
 const c=useColors(),insets=useSafeAreaInsets(),router=useRouter();
 const q=useQuery({queryKey:['moviehub','home'],queryFn:getHome,staleTime:300000});
 const hero=useMemo(()=>q.data?.trending?.find((m:any)=>m.cover?.url)||q.data?.movies?.[0],[q.data]);
 if(q.isLoading&&!q.data)return <Loading/>;
 if(q.isError&&!q.data)return <Problem message={q.error.message} retry={()=>void q.refetch()}/>;
 return <ScrollView style={{flex:1,backgroundColor:c.background}} refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={()=>void q.refetch()} tintColor={c.primary}/>} contentContainerStyle={{paddingBottom:30}}>
  <View style={{paddingTop:insets.top+13,paddingHorizontal:20,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
   <View><Text style={{color:c.primary,fontFamily:'Syne_700Bold',fontSize:23}}>Nabees</Text><Text style={{color:c.mutedForeground,fontSize:11,letterSpacing:2,marginTop:-2}}>MOVIEHUB</Text></View>
   <Pressable onPress={()=>router.push('/search' as any)} accessibilityLabel="Search movies" testID="home-search" style={{width:42,height:42,borderRadius:22,backgroundColor:c.card,alignItems:'center',justifyContent:'center'}}><Ionicons name="search" color={c.foreground} size={19}/></Pressable>
  </View>
  {hero&&<View style={{marginHorizontal:16,height:440,borderRadius:25,overflow:'hidden',backgroundColor:c.card}}>
    <ImageBackground source={{uri:hero.cover?.url||hero.coverUrl||''}} resizeMode="cover" style={{flex:1,justifyContent:'flex-end'}}>
     <LinearGradient colors={['transparent','rgba(12,13,15,.46)','rgba(12,13,15,.98)']} locations={[0,.45,1]} style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
     <View style={{padding:22,paddingBottom:25}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10}}><View style={{backgroundColor:c.primary,borderRadius:5,paddingHorizontal:9,paddingVertical:5}}><Text style={{color:'white',fontSize:10,fontFamily:'Inter_700Bold',letterSpacing:1}}>FEATURED</Text></View><Text style={{color:c.accent,fontFamily:'Inter_600SemiBold',fontSize:12}}>★ {hero.imdbRatingValue||hero.rating||'NEW'}</Text></View>
      <Text numberOfLines={3} style={{fontFamily:'Syne_700Bold',fontSize:33,lineHeight:37,color:'white'}}>{hero.title}</Text>
      <Text numberOfLines={3} style={{fontSize:13,lineHeight:20,color:'rgba(255,255,255,.75)',marginTop:10}}>{hero.description||hero.releaseDate?.slice(0,4)||'Find your next favorite'}</Text>
      <View style={{flexDirection:'row',gap:10,marginTop:19}}>
       <Pressable onPress={()=>router.push({pathname:'/movie',params:{id:String(hero.subjectId)}})} testID="hero-play" style={{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'white',borderRadius:22,paddingVertical:12,paddingHorizontal:18}}><Ionicons name="play" size={17} color="#111"/><Text style={{color:'#111',fontFamily:'Inter_700Bold'}}>Explore</Text></Pressable>
       <Pressable onPress={()=>router.push({pathname:'/movie',params:{id:String(hero.subjectId)}})} style={{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:'rgba(255,255,255,.16)',borderWidth:1,borderColor:'rgba(255,255,255,.22)',borderRadius:22,paddingVertical:12,paddingHorizontal:17}}><Ionicons name="information-circle-outline" size={17} color="white"/><Text style={{color:'white',fontFamily:'Inter_600SemiBold'}}>Details</Text></Pressable>
      </View>
     </View>
    </ImageBackground>
   </View>}
  <View style={{flexDirection:'row',gap:10,paddingHorizontal:20,marginTop:18}}>
   {[{icon:'film-outline',label:'Movies',path:'/(tabs)/discover'},{icon:'tv-outline',label:'Live TV',path:'/(tabs)/live'},{icon:'download-outline',label:'Downloads',path:'/(tabs)/downloads'}].map(x=><Pressable key={x.label} onPress={()=>router.push(x.path as any)} style={{flex:1,alignItems:'center',gap:7,borderRadius:16,padding:13,backgroundColor:c.card}}><Ionicons name={x.icon as any} size={20} color={c.primary}/><Text style={{color:c.foreground,fontSize:11,fontFamily:'Inter_600SemiBold'}}>{x.label}</Text></Pressable>)}
  </View>
  <View style={{flexDirection:'row',gap:9,paddingHorizontal:20,marginTop:10}}>
   {([['Sports','football-outline'],['WWE','play-circle-outline'],['All providers','apps-outline']] as const).map(([label,icon])=><Pressable key={label} onPress={()=>label==='All providers'?router.push('/(tabs)/more' as any):router.push({pathname:'/events',params:{type:label}})} style={{flex:1,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,borderRadius:14,paddingVertical:12,backgroundColor:c.card}}><Ionicons name={icon as any} size={16} color={c.primary}/><Text style={{color:c.foreground,fontSize:11,fontFamily:'Inter_600SemiBold'}}>{label}</Text></Pressable>)}
  </View>
  {q.data?.movies&&<Rail title="Trending movies" items={q.data.movies} onMovie={m=>router.push({pathname:'/movie',params:{id:String(m.subjectId)}})}/>}
  {q.data?.series&&<Rail title="Series worth watching" items={q.data.series} onMovie={m=>router.push({pathname:'/movie',params:{id:String(m.subjectId)}})}/>}
 </ScrollView>;
}
