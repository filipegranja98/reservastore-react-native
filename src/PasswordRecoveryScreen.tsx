import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Routes } from "./screens";
import { api } from "./client";
import { PasswordField } from "./PasswordField";
import { Button, Field, Notice, styles } from "./ui";
export function PasswordRecoveryScreen({
  navigation,
}: NativeStackScreenProps<Routes, "PasswordRecovery">) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"request" | "reset">("request"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [testMode, setTestMode] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (stage === "request") {
        const result = await api.publicRequest<{
          detail: string;
          modo_teste: boolean;
        }>("auth/recuperar-senha/", "POST", {
          email: email.trim(),
        });
        setMessage(result.detail);
        setTestMode(result.modo_teste);
        setStage("reset");
      } else {
        if (password !== confirm) throw Error("As senhas não coincidem.");
        await api.publicRequest("auth/redefinir-senha/", "POST", {
          codigo: code.trim(),
          nova_senha: password,
        });
        setPassword("");
        setConfirm("");
        setCode("");
        navigation.replace("Login", {
          notice: "Senha alterada. Entre com sua nova senha.",
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>RECUPERAR CONTA DE CLIENTE</Text>
        <Text style={styles.title}>
          {stage === "request" ? "Esqueceu sua senha?" : "Definir nova senha"}
        </Text>
        {stage === "request" ? (
          <>
            <Text style={styles.subtitle}>
              Informe o e-mail cadastrado para receber um código
              de recuperação.
            </Text>
            <Field
              label="E-mail cadastrado"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!busy}
            />
          </>
        ) : (
          <>
            {!!message && <Text style={styles.subtitle}>{message}</Text>}
            {testMode && (
              <View style={styles.card}>
                <Text style={styles.label}>Modo de teste</Text>
                <Text style={styles.small}>
                  O envio de e-mail real ainda não está habilitado. Neste
                  ambiente, as instruções de recuperação são salvas localmente
                  para teste com o responsável.
                </Text>
              </View>
            )}
            <Text style={styles.small}>
              Cole o código completo recebido. Ele expira em 15 minutos e não
              deve ser compartilhado.
            </Text>
            <Field
              label="Código de recuperação"
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={250}
              editable={!busy}
            />
            <PasswordField
              label="Nova senha"
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              editable={!busy}
            />
            <PasswordField
              label="Confirmar nova senha"
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              textContentType="newPassword"
              maxLength={128}
              editable={!busy}
            />
          </>
        )}
        {!!error && <Notice message={error} />}
        <Button
          title={
            stage === "request" ? "Solicitar recuperação" : "Salvar nova senha"
          }
          busy={busy}
          disabled={
            stage === "request"
              ? !email.trim()
              : !code.trim() || !password || !confirm
          }
          onPress={() => void submit()}
        />
        <Button
          title={
            stage === "request"
              ? "Já tenho um código"
              : "Solicitar outro código"
          }
          secondary
          disabled={busy}
          onPress={() => {
            setStage(stage === "request" ? "reset" : "request");
            setError("");
            setMessage("");
          }}
        />
        <Button
          title="Voltar ao login"
          secondary
          disabled={busy}
          onPress={() => navigation.navigate("Login")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
