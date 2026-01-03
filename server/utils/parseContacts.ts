import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { InsertContact } from "../../drizzle/schema";

// Parsed contact without userId (added during insert)
export type ParsedContact = Omit<InsertContact, "userId" | "id" | "createdAt" | "updatedAt">;

export interface ParsedContactRow {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  category?: string;
  status?: string;
  notes?: string;
  website?: string;
  contactPerson?: string;
}

/**
 * Normalize column names to match our schema
 */
function normalizeColumnName(name: string): keyof ParsedContactRow | null {
  const normalized = name.trim().toLowerCase();
  
  const mapping: Record<string, keyof ParsedContactRow> = {
    "name": "name",
    "full name": "name",
    "contact name": "name",
    "person": "name",
    "business name": "name",  // Added for business contacts
    "email": "email",
    "email address": "email",
    "e-mail": "email",
    "phone": "phone",
    "phone number": "phone",
    "telephone": "phone",
    "mobile": "phone",
    "company": "company",
    "company name": "company",
    "organization": "company",
    "org": "company",
    "business": "company",  // Added for business contacts
    "location": "location",
    "address": "location",
    "city": "location",
    "category": "category",
    "type": "category",
    "business size": "category",  // Map business size to category
    "size": "category",
    "status": "status",
    "notes": "notes",
    "note": "notes",
    "comments": "notes",
    "description": "notes",
    "website": "website",
    "url": "website",
    "web": "website",
    "contact person": "contactPerson",
    "contact": "contactPerson",
  };
  
  return mapping[normalized] || null;
}

/**
 * Validate and normalize a contact row
 */
function validateContactRow(row: ParsedContactRow, rowIndex: number): { valid: boolean; errors: string[]; contact?: ParsedContact } {
  const errors: string[] = [];
  
  // Name is required
  if (!row.name || row.name.trim().length === 0) {
    errors.push(`Row ${rowIndex + 1}: Name is required`);
  }
  
  // Validate email format if provided
  if (row.email && row.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email.trim())) {
      errors.push(`Row ${rowIndex + 1}: Invalid email format: ${row.email}`);
    }
  }
  
  // Validate status if provided
  if (row.status) {
    const validStatuses = ["prospect", "lead", "customer", "inactive"];
    const normalizedStatus = row.status.trim().toLowerCase();
    if (!validStatuses.includes(normalizedStatus)) {
      errors.push(`Row ${rowIndex + 1}: Invalid status "${row.status}". Must be one of: ${validStatuses.join(", ")}`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const contact: ParsedContact = {
    name: row.name!.trim(),
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    company: row.company?.trim() || null,
    location: row.location?.trim() || null,
    category: row.category?.trim() || null,
    status: (row.status?.trim().toLowerCase() as "prospect" | "lead" | "customer" | "inactive") || "prospect",
    notes: row.notes?.trim() || null,
    website: row.website?.trim() || null,
    contactPerson: row.contactPerson?.trim() || null,
  };
  
  return { valid: true, errors: [], contact };
}

/**
 * Parse CSV file content
 */
export function parseCSV(csvContent: string): { contacts: ParsedContact[]; errors: string[] } {
  const errors: string[] = [];
  const contacts: ParsedContact[] = [];
  
  const result = Papa.parse<ParsedContactRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeColumnName(header) || header,
  });
  
  if (result.errors.length > 0) {
    errors.push(...result.errors.map(e => `CSV Parse Error: ${e.message}`));
  }
  
  result.data.forEach((row, index) => {
    const validation = validateContactRow(row, index);
    if (validation.valid && validation.contact) {
      contacts.push(validation.contact);
    } else {
      errors.push(...validation.errors);
    }
  });
  
  return { contacts, errors };
}

/**
 * Parse Excel file content
 */
export function parseExcel(excelBuffer: Buffer): { contacts: ParsedContact[]; errors: string[] } {
  const errors: string[] = [];
  const contacts: ParsedContact[] = [];
  
  try {
    const workbook = XLSX.read(excelBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    
    if (!firstSheetName) {
      errors.push("Excel file has no sheets");
      return { contacts, errors };
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<ParsedContactRow>(worksheet, {
      defval: "",
    });
    
    // Normalize column names
    const normalizedData = jsonData.map(row => {
      const normalized: ParsedContactRow = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeColumnName(key);
        if (normalizedKey) {
          normalized[normalizedKey] = String(value || "").trim() || undefined;
        }
      });
      return normalized;
    });
    
    normalizedData.forEach((row, index) => {
      const validation = validateContactRow(row, index);
      if (validation.valid && validation.contact) {
        contacts.push(validation.contact);
      } else {
        errors.push(...validation.errors);
      }
    });
  } catch (error) {
    errors.push(`Excel Parse Error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return { contacts, errors };
}

