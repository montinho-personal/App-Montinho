// Movimentos da migração 0133 para a DEMO (em produção eles vêm do banco).
// Espelho resumido: nome, sinônimos, músculo, registro e se conta volume.
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";

type M = [slug: string, nome: string, grupo: ItemBiblioteca["grupo"], sinonimos: string[], registro: ItemBiblioteca["registro"], contaVolume: boolean, nivel: NonNullable<ItemBiblioteca["nivel"]>];

const LISTA: M[] = [
  ["thruster", "Ram Thrusters", "quadriceps", ["thruster", "agachamento com desenvolvimento"], ["carga", "repeticoes"], true, "intermediario"],
  ["sled-push", "Sled Push", "quadriceps", ["empurrar trenó"], ["carga", "tempo", "distancia"], false, "iniciante"],
  ["sled-pull", "Sled Pull", "costas", ["puxar trenó"], ["carga", "tempo", "distancia"], false, "iniciante"],
  ["corda-naval", "Battle Rope", "cardio", ["corda naval"], ["tempo"], false, "iniciante"],
  ["remo-ergometro", "Rower", "cardio", ["remo ergômetro", "row"], ["tempo", "distancia"], false, "iniciante"],
  ["snatch", "Snatch", "posteriores", ["arranco", "squat snatch"], ["carga", "repeticoes"], true, "avancado"],
  ["power-snatch", "Power Snatch", "posteriores", ["arranco de potência"], ["carga", "repeticoes"], true, "intermediario"],
  ["hang-snatch", "Hang Snatch", "posteriores", ["arranco suspenso"], ["carga", "repeticoes"], true, "intermediario"],
  ["clean", "Clean", "posteriores", ["squat clean"], ["carga", "repeticoes"], true, "avancado"],
  ["power-clean", "Power Clean", "posteriores", ["clean de potência"], ["carga", "repeticoes"], true, "intermediario"],
  ["hang-clean", "Hang Clean", "posteriores", ["clean suspenso"], ["carga", "repeticoes"], true, "intermediario"],
  ["clean-and-jerk", "Clean & Jerk", "posteriores", ["arremesso", "clean and jerk"], ["carga", "repeticoes"], true, "avancado"],
  ["split-jerk", "Split Jerk", "ombros", ["jerk afundo"], ["carga", "repeticoes"], true, "avancado"],
  ["push-jerk", "Push Jerk", "ombros", ["jerk de potência"], ["carga", "repeticoes"], true, "intermediario"],
  ["chest-to-bar", "Chest-to-Bar Pull-Up", "costas", ["chest to bar", "c2b"], ["repeticoes", "assistencia"], true, "intermediario"],
  ["toes-to-bar", "Toes-to-Bar", "abdomen", ["toes to bar", "t2b"], ["repeticoes"], true, "intermediario"],
  ["bar-muscle-up", "Bar Muscle-Up", "costas", ["bar muscle up"], ["repeticoes", "assistencia"], true, "avancado"],
  ["ring-muscle-up", "Ring Muscle-Up", "costas", ["ring muscle up", "muscle up"], ["repeticoes", "assistencia"], true, "avancado"],
  ["handstand-push-up", "Handstand Push-Up", "ombros", ["hspu", "flexão em parada de mão"], ["repeticoes", "assistencia"], true, "avancado"],
  ["handstand-walk", "Handstand Walk", "ombros", ["caminhada em parada de mão"], ["distancia", "tempo"], false, "avancado"],
  ["pistol-squat", "Pistol Squat", "quadriceps", ["pistol", "agachamento pistola"], ["repeticoes", "assistencia"], true, "intermediario"],
  ["air-squat", "Air Squat", "quadriceps", ["agachamento livre sem peso"], ["repeticoes"], false, "iniciante"],
  ["burpee", "Burpee", "full_body", ["burpees"], ["repeticoes"], false, "iniciante"],
  ["burpee-broad-jump", "Burpee Broad Jump", "full_body", ["burpee com salto à frente"], ["repeticoes", "distancia"], false, "intermediario"],
  ["double-under", "Double Under", "cardio", ["duplo na corda", "du"], ["repeticoes"], false, "intermediario"],
  ["box-jump", "Box Jump", "quadriceps", ["salto na caixa"], ["repeticoes"], false, "iniciante"],
  ["wall-ball", "Wall Ball", "quadriceps", ["wall balls"], ["carga", "repeticoes"], false, "iniciante"],
  ["kettlebell-swing", "Kettlebell Swing", "gluteo", ["kb swing", "swing"], ["carga", "repeticoes"], false, "iniciante"],
  ["ski-erg", "Ski Erg (ergômetro de esqui)", "cardio", ["skierg", "ski"], ["tempo", "distancia", "calorias"], false, "iniciante"],
  ["air-bike", "Air Bike", "cardio", ["assault bike", "echo bike"], ["tempo", "distancia", "calorias"], false, "iniciante"],
  ["sandbag-carry", "Sandbag Carry", "core", ["carregar saco de areia"], ["carga", "distancia", "tempo"], false, "iniciante"],
  ["sandbag-lunges", "Sandbag Lunges", "quadriceps", ["passada com saco de areia"], ["carga", "distancia", "repeticoes"], false, "intermediario"],
  ["med-ball-slam", "Med Ball Slam", "core", ["slam ball"], ["carga", "repeticoes"], false, "iniciante"],
];

export const MOVIMENTOS_DEMO: ItemBiblioteca[] = LISTA.map(([slug, nome, grupo, sinonimos, registro, contaVolume, nivel]) => ({
  id: `cat-${slug}`, slug, nome, sinonimos, grupo, secundarios: [], pesosSecundarios: {}, padrao: null, articulacoes: [], equipamento: [], tipo: "multiarticular",
  nivel, execucao: [], erros: [], registro, estresse: [], contaVolume, origem: "catalogo", midia: null,
}));
