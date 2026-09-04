export type CarrierCode = 'FEDEX' | 'DHL' | 'BLUEDART' | 'DELHIVERY' | 'OTHER';

export interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  description: string;
}

export interface TrackingResult {
  carrier: CarrierCode;
  awb: string;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'PENDING' | 'EXCEPTION' | 'UNKNOWN';
  deliveredAt?: string;
  estimatedDelivery?: string;
  lastLocation?: string;
  events: TrackingEvent[];
  isDemo: boolean;
}

/**
 * Carrier tracking service.
 * In demo mode (no carrier API keys configured), returns realistic simulated data.
 * Real integrations are activated via env vars: CARRIER_FEDEX_KEY, CARRIER_DHL_KEY.
 */
export class CarrierService {
  async track(carrier: CarrierCode, awb: string): Promise<TrackingResult> {
    const fedexKey = process.env.CARRIER_FEDEX_KEY;
    const dhlKey = process.env.CARRIER_DHL_KEY;

    const isRealCarrier =
      (carrier === 'FEDEX' && fedexKey && !fedexKey.includes('...')) ||
      (carrier === 'DHL' && dhlKey && !dhlKey.includes('...'));

    if (isRealCarrier) {
      try {
        if (carrier === 'FEDEX') return await this.trackFedEx(awb, fedexKey!);
        if (carrier === 'DHL') return await this.trackDHL(awb, dhlKey!);
      } catch (err) {
        console.warn('[CarrierService] Live tracking failed, falling back to demo:', err);
      }
    }

    return this.mockTrack(carrier, awb);
  }

  private async trackFedEx(awb: string, apiKey: string): Promise<TrackingResult> {
    const res = await fetch('https://apis.fedex.com/track/v1/trackingnumbers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber: awb } }],
      }),
    });
    if (!res.ok) throw new Error(`FedEx API error: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    // Parse FedEx response format
    const trackResult = (data as { output?: { completeTrackResults?: Array<{ trackResults?: Array<{ latestStatusDetail?: { code?: string }; dateAndTimes?: Array<{ dateTime?: string }> }> }> } }).output?.completeTrackResults?.[0]?.trackResults?.[0];
    const statusCode = trackResult?.latestStatusDetail?.code ?? 'UNKNOWN';
    return {
      carrier: 'FEDEX',
      awb,
      status: statusCode === 'DL' ? 'DELIVERED' : statusCode === 'OD' ? 'OUT_FOR_DELIVERY' : 'IN_TRANSIT',
      deliveredAt: statusCode === 'DL' ? trackResult?.dateAndTimes?.[0]?.dateTime : undefined,
      events: [],
      isDemo: false,
    };
  }

  private async trackDHL(awb: string, apiKey: string): Promise<TrackingResult> {
    const res = await fetch(`https://api-eu.dhl.com/track/shipments?trackingNumber=${awb}`, {
      headers: { 'DHL-API-Key': apiKey },
    });
    if (!res.ok) throw new Error(`DHL API error: ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const shipment = (data as { shipments?: Array<{ status?: { status?: string; timestamp?: string; location?: { address?: { addressLocality?: string } } }; estimatedTimeOfDelivery?: string }> }).shipments?.[0];
    const statusStr = shipment?.status?.status ?? 'unknown';
    return {
      carrier: 'DHL',
      awb,
      status: statusStr === 'delivered' ? 'DELIVERED' : 'IN_TRANSIT',
      deliveredAt: statusStr === 'delivered' ? shipment?.status?.timestamp : undefined,
      estimatedDelivery: shipment?.estimatedTimeOfDelivery,
      lastLocation: shipment?.status?.location?.address?.addressLocality,
      events: [],
      isDemo: false,
    };
  }

  private mockTrack(carrier: CarrierCode, awb: string): TrackingResult {
    // Realistic simulated tracking for demo/dev
    const deliveredAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    return {
      carrier,
      awb,
      status: 'DELIVERED',
      deliveredAt,
      lastLocation: 'Bengaluru, KA',
      events: [
        { timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), location: 'Mumbai, MH', status: 'IN_TRANSIT', description: 'Package picked up from sender' },
        { timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), location: 'Pune, MH', status: 'IN_TRANSIT', description: 'In transit to destination hub' },
        { timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), location: 'Bengaluru Hub, KA', status: 'OUT_FOR_DELIVERY', description: 'Out for delivery' },
        { timestamp: deliveredAt, location: 'Bengaluru, KA', status: 'DELIVERED', description: 'Delivered — signed by receiver' },
      ],
      isDemo: true,
    };
  }
}

export const carrierService = new CarrierService();
