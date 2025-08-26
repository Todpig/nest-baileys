import { delay, WASocket } from 'baileys';

const socketVersionPage =
  'https://wppconnect-team.github.io/pt-BR/whatsapp-versions';
const versionFinder = /[1-9]+.[0-9]+.[0-9]+-alpha/;

export async function getWhatsappSocketVersion(): Promise<
  [number, number, number]
> {
  const siteHtml = await fetch(socketVersionPage).then((res) => res.text());
  const versionMatch = versionFinder.exec(siteHtml);
  if (!versionMatch) throw new Error('Version not found in the HTML');
  const versionString = versionMatch[0];
  const versionArray = versionString
    .split('.')
    .map((n) => Number(n.replace(/\D/g, '')));
  return [versionArray[0], versionArray[1], versionArray[2]];
}

function generateRandomValue(max: number, min: number) {
  return Math.round(Math.random() * (max - min) + min);
}

/**
 * Calcula o tempo de digitação de uma mensagem pela quantidade de caracteres.
 * O valor é estimado com base em um TPM de 180 que equivale a um usuário de smartphone.
 * @param message A mensagem a ser enviada.
 * @returns O tempo estimado de digitação em milissegundos.
 */
function calculateTypingTime(message: string) {
  const TPS = 180 / 60;
  return Math.round((message.length / TPS) * 1000);
}

export async function fakeTyping(
  socket: WASocket,
  jid: string,
  message: string,
) {
  if (!message) return;
  await socket.sendPresenceUpdate('composing', jid);
  const typingTime = calculateTypingTime(message);
  await delay(typingTime < 1000 ? generateRandomValue(1000, 2000) : typingTime);
  await socket.sendPresenceUpdate('paused', jid);
}
