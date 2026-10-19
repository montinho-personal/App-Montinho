import { listTemplates } from "@/lib/db";
import { PrescricaoClient } from "./PrescricaoClient";
import { BRAND } from "@/config/brand";

export const metadata = { title: `Prescrição · ${BRAND.fullName}` };

export default async function PrescricaoPage() {
  const templates = await listTemplates();
  return <PrescricaoClient templates={templates} />;
}
