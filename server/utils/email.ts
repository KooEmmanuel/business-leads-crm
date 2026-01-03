import nodemailer from "nodemailer";
import { ENV } from "../_core/env";
import imaps from "imap-simple";
import { simpleParser } from "mailparser";

/**
 * Email Service for sending and receiving emails
 */
export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: ENV.email.host,
    port: ENV.email.port,
    secure: ENV.email.port === 465, // true for 465, false for other ports
    auth: {
      user: ENV.email.user,
      pass: ENV.email.pass,
    },
  });

  /**
   * Send an email
   */
  static async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${ENV.email.from.split('@')[0]}" <${ENV.email.from}>`,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ""),
        html,
      });
      console.log("[Email] Message sent: %s", info.messageId);
      return info;
    } catch (error) {
      console.error("[Email] Failed to send email:", error);
      throw new Error("Failed to send email");
    }
  }

  /**
   * Simple cleanup for technical headers in text bodies
   */
  private static cleanTextBody(text: string): string {
    if (!text) return "";
    // Remove common technical headers from bounce messages
    return text
      .split('\n')
      .filter(line => !line.match(/^(Reporting-MTA|X-Mango-Mail|Arrival-Date|Final-Recipient|Original-Recipient|Action|Status|Remote-MTA|Diagnostic-Code|X-Google-DKIM|X-Gm-Message|Authentication-Results):/i))
      .join('\n')
      .trim();
  }

  /**
   * Fetch recent emails via IMAP
   */
  static async fetchEmails(limit: number = 10) {
    const config = {
      imap: {
        user: ENV.email.user,
        password: ENV.email.pass,
        host: ENV.email.host.replace("smtp", "imap"), // Assuming standard naming convention
        port: 993,
        tls: true,
        authTimeout: 3000,
      },
    };

    try {
      const connection = await imaps.connect(config);
      await connection.openBox("INBOX");

      const searchCriteria = ["ALL"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: false,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      const parsedEmails = [];

      // Sort by UID descending to get most recent
      messages.sort((a, b) => b.attributes.uid - a.attributes.uid);

      for (const message of messages.slice(0, limit)) {
        const all = message.parts.find((part) => part.which === "");
        const id = message.attributes.uid;
        if (all) {
          const parsed = await simpleParser(all.body);
          
          // Extract pure email address from "Name <email@domain.com>" or just "email@domain.com"
          const fromText = parsed.from?.text || "";
          let fromEmail = fromText;
          const emailMatch = fromText.match(/<([^>]+)>/);
          if (emailMatch && emailMatch[1]) {
            fromEmail = emailMatch[1].trim();
          } else {
            fromEmail = fromText.trim();
          }

          // Thread ID calculation: normalized subject
          const threadId = parsed.subject?.replace(/^(Re|Fwd|Aw|Rif):\s*/i, "").trim().toLowerCase() || "no-subject";

          parsedEmails.push({
            uid: id,
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
            threadId: threadId,
            from: fromText,
            fromEmail: fromEmail,
            to: parsed.to?.text || "",
            subject: parsed.subject,
            date: parsed.date,
            text: this.cleanTextBody(parsed.text || ""),
            html: parsed.html,
          });
        }
      }

      connection.end();
      return parsedEmails;
    } catch (error) {
      console.error("[Email] Failed to fetch emails:", error);
      throw new Error("Failed to fetch emails");
    }
  }
}

