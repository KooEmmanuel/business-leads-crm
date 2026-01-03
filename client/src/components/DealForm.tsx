import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Deal } from "../../../drizzle/schema";

const DEAL_STAGES = ["prospecting", "negotiation", "proposal", "won", "lost"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "CAD"] as const;

interface DealFormProps {
  deal?: Deal;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DealForm({ deal, onSuccess, onCancel }: DealFormProps) {
  const { data: contacts, isLoading: contactsLoading } = trpc.contacts.list.useQuery();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    title: deal?.title || "",
    contactId: deal?.contactId?.toString() || "",
    description: deal?.description || "",
    value: deal?.value?.toString() || "",
    currency: deal?.currency || "USD",
    stage: deal?.stage || "prospecting",
    probability: deal?.probability?.toString() || "50",
    expectedCloseDate: deal?.expectedCloseDate 
      ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
      : "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      onSuccess?.();
    },
  });

  const updateDealMutation = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.get.invalidate({ id: deal!.id });
      onSuccess?.();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.contactId) newErrors.contactId = "Contact is required";
    if (formData.value && isNaN(parseFloat(formData.value))) {
      newErrors.value = "Value must be a number";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dealData = {
      title: formData.title.trim(),
      contactId: parseInt(formData.contactId),
      description: formData.description.trim() || null,
      value: formData.value ? parseFloat(formData.value) : null,
      currency: formData.currency,
      stage: formData.stage as typeof DEAL_STAGES[number],
      probability: parseInt(formData.probability),
      expectedCloseDate: formData.expectedCloseDate || null,
    };

    if (deal) {
      updateDealMutation.mutate({ id: deal.id, ...dealData });
    } else {
      createDealMutation.mutate(dealData);
    }
  };

  const isSubmitting = createDealMutation.isPending || updateDealMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="brutalist-card bg-card">
        <CardHeader>
          <CardTitle>{deal ? "Edit Deal" : "Create New Deal"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Deal Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setErrors({ ...errors, title: "" });
              }}
              placeholder="e.g., Website Redesign Project"
              disabled={isSubmitting}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <Label htmlFor="contact">
              Contact <span className="text-destructive">*</span>
            </Label>
            {contactsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading contacts...
              </div>
            ) : (
              <Select
                value={formData.contactId}
                onValueChange={(value) => {
                  setFormData({ ...formData, contactId: value });
                  setErrors({ ...errors, contactId: "" });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Select a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      <div className="flex flex-col">
                        <span>{contact.name}</span>
                        {contact.company && (
                          <span className="text-xs text-muted-foreground">{contact.company}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.contactId && <p className="text-sm text-destructive">{errors.contactId}</p>}
          </div>

          {/* Value and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Deal Value</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => {
                  setFormData({ ...formData, value: e.target.value });
                  setErrors({ ...errors, value: "" });
                }}
                placeholder="e.g., 50000"
                disabled={isSubmitting}
              />
              {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stage and Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage} className="capitalize">
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={formData.expectedCloseDate}
              onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about the deal..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {deal ? "Update Deal" : "Create Deal"}
        </Button>
      </div>
    </form>
  );
}

