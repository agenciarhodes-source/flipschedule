export interface DemoMessage { id: string; direction: "incoming" | "outgoing"; body: string; sentAt: string; }
export interface DemoConversation { id: string; patientId: string; patientName: string; channel: "WhatsApp" | "Instagram"; unread: number; messages: readonly DemoMessage[]; }
export const demoConversations: readonly DemoConversation[] = [
 { id: "conv-1", patientId: "patient-1", patientName: "Marina Alves", channel: "WhatsApp", unread: 2, messages: [{ id: "msg-1", direction: "incoming", body: "Olá, gostaria de confirmar meu horário.", sentAt: "2026-09-15T14:20:00.000Z" }, { id: "msg-2", direction: "outgoing", body: "Olá, Marina! Seu horário está confirmado.", sentAt: "2026-09-15T14:24:00.000Z" }] },
 { id: "conv-2", patientId: "patient-2", patientName: "João Pedro Lima", channel: "Instagram", unread: 0, messages: [{ id: "msg-3", direction: "incoming", body: "Vocês trabalham com implantes?", sentAt: "2026-09-15T12:00:00.000Z" }] },
];
