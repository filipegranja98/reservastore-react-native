import React, { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { reservaCondominiums } from "./condominiums";
import { Button, colors, styles } from "./ui";
export function CondominiumPicker({ value, disabled, onChange }: { value: string; disabled: boolean; onChange(value: string): void }) {
  const [open, setOpen] = useState(false);
  const choices = reservaCondominiums;
  return <>
    <Text style={styles.label}>Selecione seu condomínio (obrigatório)</Text>
    <Button title={value ? `✓ ${value}` : "Selecionar meu condomínio"} selected={!!value} disabled={disabled} onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{flex:1,backgroundColor:colors.cream}}>
        <View style={{padding:22,gap:14}}>
          <Text style={styles.section}>Reserva São Lourenço</Text>
          <Text style={styles.small}>Toque no condomínio onde você mora. Não é necessário digitar.</Text>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:22,paddingBottom:22,gap:10}}>
          {choices.map(name => <Button key={name} title={`${value === name ? "✓ " : ""}${name}`} selected={value === name} onPress={() => {onChange(name);setOpen(false);}} />)}
          {!choices.length && <Text style={styles.small}>Nenhum condomínio encontrado.</Text>}
        </ScrollView>
        <View style={{padding:22}}><Button title="Voltar ao endereço" secondary onPress={() => setOpen(false)} /></View>
      </SafeAreaView>
    </Modal>
  </>;
}
