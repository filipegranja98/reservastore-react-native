import {MerchantPromotionsScreen} from "./src/PromotionScreens";
import {BookingCancellationNotice} from "./src/BookingCancellationNotice";
import { PasswordRecoveryScreen } from "./src/PasswordRecoveryScreen";
import { ScheduleServiceScreen, AppointmentsScreen } from "./src/AppointmentScreens";
import { MerchantCatalogScreen } from "./src/MerchantCatalogScreen";
import { ReservaBrand } from "./src/ReservaBrand";
import { MerchantCategoriesScreen } from "./src/MerchantCategoriesScreen";
import { NavigationMenu } from "./src/NavigationMenu";
import { landingRoute } from "./src/roles";
import { CheckoutScreen } from "./src/CheckoutScreen";
import { OrdersScreen, OrderScreen } from "./src/OrderScreens";
import { CartScreen } from "./src/CartScreen";
import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "./src/session";
import {
  AccountScreen,
  LoginScreen,
  RegisterScreen,
  ShopScreen,
  ShopsScreen,
  type Routes,
} from "./src/screens";
import { colors, styles } from "./src/ui";
const Stack = createNativeStackNavigator<Routes>();
function Navigation() {
  const { booting, account } = useSession();
  const navigationRef=useNavigationContainerRef<Routes>();
  if (booting)
    return (
      <View
        style={[
          styles.screen,
          { alignItems: "center", justifyContent: "center", gap: 20 },
        ]}
      >
        <ReservaBrand size={156} />
        <ActivityIndicator color={colors.green} />
      </View>
    );
  return (
    <NavigationContainer ref={navigationRef}>
      <View style={{flex:1}}>
      <BookingCancellationNotice onOpen={()=>{if(navigationRef.isReady())navigationRef.navigate("Appointments");}}/>
      <Stack.Navigator
        initialRouteName={landingRoute(account?.papel)}
        screenOptions={{
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerRight: ({ tintColor }) => (
            <NavigationMenu key={account?.id ?? "visitor"} color={tintColor} />
          ),
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        <Stack.Screen name="MerchantPromotions" component={MerchantPromotionsScreen} options={{title:"Promoções da loja"}}/>
        <Stack.Screen name="ScheduleService" component={ScheduleServiceScreen} options={{title:"Solicitar agendamento"}} />
        <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{title:"Agendamentos"}} />
        <Stack.Screen
          name="PasswordRecovery"
          component={PasswordRecoveryScreen}
          options={{ title: "Recuperar senha" }}
        />
        <Stack.Screen
          name="MerchantCatalog"
          component={MerchantCatalogScreen}
          options={{ title: "Produtos e serviços" }}
        />
        <Stack.Screen
          name="MerchantCategories"
          component={MerchantCategoriesScreen}
          options={{ title: "Painel da loja" }}
        />
        <Stack.Screen
          name="Shops"
          component={ShopsScreen}
          options={{
            title: "Reserva Store",
            headerTitle: () => (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Image
                  source={require("./assets/reserva-store-logo-v1.png")}
                  resizeMode="contain"
                  accessible={false}
                  style={{ width: 30, height: 30 }}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.ink,
                    fontSize: 18,
                    fontWeight: "700",
                    flexShrink: 1,
                  }}
                >
                  Reserva Store
                </Text>
              </View>
            ),
          }}
        />
        <Stack.Screen
          name="Shop"
          component={ShopScreen}
          options={{ title: "A loja" }}
        />
        <Stack.Screen
          name="Cart"
          component={CartScreen}
          options={{ title: "Carrinho da loja" }}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{ title: "Finalizar pedido" }}
        />
        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{
            title:
              account?.papel === "lojista" ? "Pedidos da loja" : "Meus pedidos",
          }}
        />
        <Stack.Screen
          name="Order"
          component={OrderScreen}
          options={{ title: "Pedido" }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: "Entrar" }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: "Criar conta" }}
        />
        <Stack.Screen
          name="Account"
          component={AccountScreen}
          options={{ title: "Minha conta" }}
        />
      </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView
        edges={["bottom"]}
        style={{ flex: 1, backgroundColor: colors.cream }}
      >
        <SessionProvider>
          <Navigation />
        </SessionProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
