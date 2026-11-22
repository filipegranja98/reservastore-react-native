// Generate launcher assets from the existing brand logo using Expo's asset pipeline.
const fs=require('node:fs/promises');const path=require('node:path');
const project=path.resolve(__dirname,'..');
const {generateImageAsync,generateImageBackgroundAsync,compositeImagesAsync}=require('@expo/image-utils');
const {setIconAsync}=require('@expo/prebuild-config/build/plugins/icons/withAndroidIcons');
async function asset(name,size,color){
 const background=await generateImageBackgroundAsync({width:1024,height:1024,resizeMode:'contain',backgroundColor:color});
 const foreground=(await generateImageAsync({projectRoot:project,cacheType:'reserva-launcher-'+name},{src:path.join(project,'assets/reserva-store-logo-v1.png'),width:size,height:size,resizeMode:'contain',backgroundColor:'transparent'})).source;
 await fs.writeFile(path.join(project,'assets',name),await compositeImagesAsync({foreground,background,x:(1024-size)/2,y:(1024-size)/2}));
}
(async()=>{
 await asset('reserva-app-icon.png',896,'#F5F5EF');
 await asset('reserva-adaptive-icon.png',640,'transparent');
 await setIconAsync(project,{icon:path.join(project,'assets/reserva-app-icon.png'),foregroundImage:path.join(project,'assets/reserva-adaptive-icon.png'),monochromeImage:path.join(project,'assets/reserva-adaptive-icon.png'),backgroundImage:null,backgroundColor:'#F5F5EF',isAdaptive:true});
 const colors=path.join(project,'android/app/src/main/res/values/colors.xml');
 let xml=await fs.readFile(colors,'utf8');
 if(xml.includes('name="iconBackground"'))xml=xml.replace(/(<color name="iconBackground">)[^<]*(<\/color>)/,'$1#F5F5EF$2');
 else xml=xml.replace('</resources>','  <color name="iconBackground">#F5F5EF</color>\n</resources>');
 await fs.writeFile(colors,xml);
 console.log('Reserva Store launcher icons generated for all Android densities.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
