import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Text, View } from "react-native";
import type { Order } from "./types";
import { orderProgress } from "./orderStages";
import { colors, styles } from "./ui";

export function OrderProgress({order}: {order: Pick<Order,"status" | "modalidade">}) {
  const state = orderProgress(order.status,order.modalidade === "retirada");
  const pulse = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(1)).current;
  const [reduceMotion,setReduceMotion] = useState(true);
  useEffect(() => {
    let active=true;
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(active)setReduceMotion(value);}).catch(()=>{});
    const listener=AccessibilityInfo.addEventListener("reduceMotionChanged",setReduceMotion);
    return () => {active=false;listener.remove();};
  },[]);
  useEffect(() => {
    if(reduceMotion || state.finished || state.index < 0) {pulse.setValue(1);return;}
    const animation=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:0.4,duration:850,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:1,duration:850,useNativeDriver:true}),
    ]));
    animation.start(); return () => {animation.stop();pulse.setValue(1);};
  },[reduceMotion,state.finished,state.index,pulse]);
  useEffect(() => {
    if(reduceMotion){reveal.setValue(1);return;}
    reveal.setValue(0);
    const animation=Animated.timing(reveal,{toValue:1,duration:320,useNativeDriver:true});
    animation.start();return () => animation.stop();
  },[order.status,reduceMotion,reveal]);
  const accent=state.canceled ? colors.error : colors.green;
  return <View style={{gap:18}}>
    <Animated.View style={{backgroundColor:accent,borderRadius:24,padding:24,gap:14,opacity:reveal,transform:[{translateY:reveal.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}}>
      <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
        <Animated.View style={{width:9,height:9,borderRadius:5,backgroundColor:"white",opacity:pulse}} />
        <Text style={{color:"white",fontSize:12,fontWeight:"700",letterSpacing:1}}>{state.finished ? "PEDIDO ENCERRADO" : "ACOMPANHE SEU PEDIDO"}</Text>
      </View>
      <View accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={{color:"white",fontSize:28,fontWeight:"700",lineHeight:34}}>{state.current.title}</Text>
        <Text style={{color:"#FFFFFF",fontSize:15,lineHeight:23,marginTop:8}}>{state.current.description}</Text>
      </View>
      <Text style={{color:"white",fontSize:13}}>{order.modalidade === "retirada" ? "Retirada na loja" : "Entrega no seu endereço"}</Text>
      {!state.canceled && state.index >= 0 && <View accessibilityRole="progressbar" accessibilityValue={{min:1,max:state.steps.length,now:state.index+1,text:`Etapa ${state.index+1} de ${state.steps.length}`}} style={{gap:8}}>
        <View style={{height:5,backgroundColor:"#FFFFFF40",borderRadius:4,overflow:"hidden"}}><View style={{height:5,width:`${Math.max(5,state.progress*100)}%`,backgroundColor:"white",borderRadius:4}} /></View>
        <Text style={{color:"white",fontSize:12}}>Etapa {state.index+1} de {state.steps.length}</Text>
      </View>}
    </Animated.View>
    {!state.canceled && <View style={[styles.card,{padding:22}]}>
      <Text style={styles.section}>Caminho do pedido</Text>
      {state.steps.map((step,index) => {
        const done=index < state.index, current=index === state.index;
        return <View key={step.key} style={{flexDirection:"row",gap:14}}>
          <View style={{alignItems:"center",width:32}}>
            <View style={{width:32,height:32,borderRadius:16,backgroundColor:done || current ? colors.green : "#E7ECE7",justifyContent:"center",alignItems:"center"}}>
              <Text style={{color:done || current ? "white" : colors.muted,fontWeight:"700"}}>{done ? "✓" : index+1}</Text>
            </View>
            {index < state.steps.length-1 && <View style={{width:2,minHeight:22,flex:1,backgroundColor:done ? colors.green : "#E7ECE7"}} />}
          </View>
          <View style={{flex:1,paddingBottom:index===state.steps.length-1?0:18,gap:4}}>
            <Text style={{color:current ? colors.green : done ? colors.ink : colors.muted,fontSize:15,fontWeight:current?"700":"500"}}>{step.title}{current ? " • agora" : ""}</Text>
            {current && <Text style={styles.small}>{step.description}</Text>}
          </View>
        </View>;
      })}
    </View>}
  </View>;
}
