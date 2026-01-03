import axios from "axios";
import { ENV } from "../_core/env";

/**
 * KwickFlow Admin API Client
 */
export class KwickFlowClient {
  private static getHeaders() {
    return {
      "x-api-key": ENV.adminApiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Fetch all businesses from KwickFlow
   */
  static async getBusinesses() {
    try {
      const baseUrl = ENV.adminApiUrl.endsWith('/') ? ENV.adminApiUrl.slice(0, -1) : ENV.adminApiUrl;
      const response = await axios.get(`${baseUrl}/api/admin/businesses`, {
        headers: this.getHeaders(),
      });
      console.log("[KwickFlow API Response]:", JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error("[KwickFlow] Failed to fetch businesses:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch KwickFlow businesses");
    }
  }
}

