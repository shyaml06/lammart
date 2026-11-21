'use client';

import * as React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitContactEnquiry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ContactForm() {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    email: '',
    subject: 'Laminate Enquiry',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim())) {
      toast.error('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!formData.message.trim()) {
      toast.error('Please enter your message or material requirement');
      return;
    }

    setLoading(true);
    try {
      const res = await submitContactEnquiry(formData);
      if (res.success) {
        toast.success(res.message);
        setFormData({
          name: '',
          phone: '',
          email: '',
          subject: 'Laminate Enquiry',
          message: '',
        });
      } else {
        toast.error('Something went wrong. Please try contacting us on WhatsApp.');
      }
    } catch {
      toast.error('Failed to submit message. Please call our showroom desk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Full Name *</label>
          <Input
            required
            placeholder="e.g. Rajesh Patel"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Mobile Phone Number *</label>
          <Input
            required
            type="tel"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Email Address (Optional)</label>
          <Input
            type="email"
            placeholder="rajesh@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-700">Inquiry Subject *</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Laminate Enquiry">Decorative Laminates / Design Code</option>
            <option value="Plywood Order">Plywood &amp; Boards (Marine / MR)</option>
            <option value="Hardware Order">Architectural Hardware &amp; Handles</option>
            <option value="Bulk Project Quotation">Bulk Commercial Project Quote</option>
            <option value="Sample Swatches Request">Material Swatch Inquiries</option>
            <option value="General Support">General Order &amp; Delivery Support</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-zinc-700">Message / Material Requirements *</label>
        <textarea
          required
          rows={4}
          placeholder="Please describe the design codes, sheet quantities, or project details..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="flex w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full gap-2 font-bold h-11">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Sending to Ahmedabad Desk...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Submit Inquiry</span>
          </>
        )}
      </Button>
    </form>
  );
}
