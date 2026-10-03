export interface BonusRequest {
  sessionId: string;
  tableId: string;
  venue: string;
  offer: string;
}
export interface DemoReceipt {
  success: true;
  orderId: string;
  provider: "Mock POS";
  demo: true;
}
export interface PosAdapter {
  sendOrder(request: BonusRequest): Promise<DemoReceipt>;
}
