"use client";
// Métrica agregada: o aluno abriu a coleção completa.
import { useEffect } from "react";
import { enviarEvento } from "@/components/chalala/evento";

export function ColecaoVista() {
  useEffect(() => enviarEvento({ tipo: "colecao_vista", origem: "colecao" }), []);
  return null;
}
