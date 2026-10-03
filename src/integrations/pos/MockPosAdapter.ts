import type { PosAdapter, BonusRequest, DemoReceipt } from "./PosAdapter";
/** In-memory response only. No network, staff notification, order or payment. */
export class MockPosAdapter implements PosAdapter {
  async sendOrder(request: BonusRequest): Promise<DemoReceipt> {
    if (!request.sessionId || !request.offer)
      throw new Error("Missing demo context");
    return {
      success: true,
      orderId: "DEMO-1024",
      provider: "Mock POS",
      demo: true,
    };
  }
}
