import axios from "axios";
import { ENV } from "../_core/env";

const VAPI_URL = "https://api.vapi.ai";

/**
 * Vapi API Client
 */
export class VapiClient {
  private static getHeaders() {
    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      throw new Error("VAPI_PRIVATE_KEY is not set in environment variables");
    }
    return {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create an assistant (agent) in Vapi
   */
  static async createAssistant(data: {
    name: string;
    model?: string;
    voice?: string;
    voiceProvider?: string;
    transcriber?: string;
    firstMessage?: string;
    systemPrompt?: string;
    voicemailMessage?: string;
    endCallMessage?: string;
  }) {
    try {
      const response = await axios.post(
        `${VAPI_URL}/assistant`,
        {
          name: data.name,
          model: {
            provider: "openai",
            model: data.model || "gpt-4o",
            messages: [
              {
                role: "system",
                content: data.systemPrompt || "You are a helpful assistant.",
              },
            ],
            temperature: 0.5,
          },
          voice: {
            provider: data.voiceProvider || "vapi",
            voiceId: data.voice || "Elliot",
          },
          transcriber: {
            provider: "deepgram",
            model: "nova-3",
            language: "en",
          },
          firstMessage: data.firstMessage || `Hello, this is ${data.name}. How can I help you today?`,
          voicemailMessage: data.voicemailMessage,
          endCallMessage: data.endCallMessage,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to create assistant:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create Vapi assistant");
    }
  }

  /**
   * List assistants
   */
  static async listAssistants() {
    try {
      const response = await axios.get(`${VAPI_URL}/assistant`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to list assistants:", error.response?.data || error.message);
      throw new Error("Failed to list Vapi assistants");
    }
  }

  /**
   * Update an assistant
   */
  static async updateAssistant(id: string, data: {
    name?: string;
    model?: string;
    voice?: string;
    voiceProvider?: string;
    firstMessage?: string;
    systemPrompt?: string;
    voicemailMessage?: string;
    endCallMessage?: string;
  }) {
    try {
      const updatePayload: any = {};
      if (data.name) updatePayload.name = data.name;
      if (data.model || data.systemPrompt) {
        updatePayload.model = {
          provider: "openai",
          model: data.model || "gpt-4o",
          messages: [
            {
              role: "system",
              content: data.systemPrompt || "You are a helpful assistant.",
            },
          ],
          temperature: 0.5,
        };
      }
      if (data.voice || data.voiceProvider) {
        updatePayload.voice = {
          provider: data.voiceProvider || "vapi",
          voiceId: data.voice || "Elliot",
        };
      }
      if (data.firstMessage) updatePayload.firstMessage = data.firstMessage;
      if (data.voicemailMessage) updatePayload.voicemailMessage = data.voicemailMessage;
      if (data.endCallMessage) updatePayload.endCallMessage = data.endCallMessage;

      const response = await axios.patch(
        `${VAPI_URL}/assistant/${id}`,
        updatePayload,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to update assistant:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to update Vapi assistant");
    }
  }

  /**
   * Delete an assistant
   */
  static async deleteAssistant(id: string) {
    try {
      await axios.delete(`${VAPI_URL}/assistant/${id}`, {
        headers: this.getHeaders(),
      });
      return { success: true };
    } catch (error: any) {
      console.error("[Vapi] Failed to delete assistant:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to delete Vapi assistant");
    }
  }

  /**
   * Helper to format phone numbers to E.164
   */
  static formatE164(number: string): string {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    if (cleaned.length > 10 && !number.startsWith("+")) {
      return `+${cleaned}`;
    }
    return number.startsWith("+") ? number : `+${cleaned}`;
  }

  /**
   * Initiate a call
   */
  static async createCall(data: {
    assistantId: string;
    phoneNumberId?: string;
    customerNumber: string;
  }) {
    try {
      const response = await axios.post(
        `${VAPI_URL}/call/phone`,
        {
          assistantId: data.assistantId,
          phoneNumberId: data.phoneNumberId,
          customer: {
            number: this.formatE164(data.customerNumber),
          },
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to initiate call:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to initiate Vapi call");
    }
  }

  /**
   * List phone numbers
   */
  static async listPhoneNumbers() {
    try {
      const response = await axios.get(`${VAPI_URL}/phone-number`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to list phone numbers:", error.response?.data || error.message);
      throw new Error("Failed to list Vapi phone numbers");
    }
  }

  /**
   * List calls
   */
  static async listCalls() {
    try {
      const response = await axios.get(`${VAPI_URL}/call`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to list calls:", error.response?.data || error.message);
      throw new Error("Failed to list Vapi calls");
    }
  }

  /**
   * Provision a Vapi-native phone number
   */
  static async provisionPhoneNumber(data: {
    areaCode?: string;
    name?: string;
  }) {
    try {
      const response = await axios.post(
        `${VAPI_URL}/phone-number`,
        {
          provider: "vapi",
          number: data.areaCode ? `+1${data.areaCode}` : undefined, // Vapi usually takes area code or defaults
          name: data.name || "My Vapi Number",
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to provision phone number:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to provision Vapi phone number");
    }
  }

  /**
   * Update a phone number (e.g., to link an assistant)
   */
  static async updatePhoneNumber(id: string, data: { assistantId?: string; name?: string }) {
    try {
      const response = await axios.patch(
        `${VAPI_URL}/phone-number/${id}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to update phone number:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to update Vapi phone number");
    }
  }

  /**
   * Import a phone number into Vapi (from Twilio, Vonage, etc.)
   */
  static async importPhoneNumber(data: {
    provider: string;
    number: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
  }) {
    try {
      const response = await axios.post(
        `${VAPI_URL}/phone-number`,
        {
          provider: data.provider,
          number: this.formatE164(data.number),
          twilioAccountSid: data.twilioAccountSid,
          twilioAuthToken: data.twilioAuthToken,
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      console.error("[Vapi] Failed to import phone number:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to import phone number to Vapi");
    }
  }
}

