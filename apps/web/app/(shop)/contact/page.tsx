import type { Metadata } from 'next';
import { MapPin, Phone, Mail, Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import { ContactForm } from '@/components/contact/contact-form';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Contact Us - Lammart Showroom & Customer Desk Ahmedabad',
  description:
    'Contact Lammart Surfaces. Visit our S.G. Highway Ahmedabad showroom or enquire for quotes, deliveries, and sample swatches.',
};

export default function ContactPage() {
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-12 space-y-12">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Contact', url: '/contact' },
        ]}
      />

      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-[#0B7A55] font-heading">
          Get In Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-black font-heading tracking-tight text-[#14201B]">
          We&apos;re Here to Assist Your Material Needs
        </h1>
        <p className="text-xs sm:text-sm text-[#5B6660]">
          Reach out to our customer care desk, visit our Ahmedabad experience showroom, or send us a project requirement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Contact Cards & Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* WhatsApp Direct Card */}
          <div className="rounded-16 border border-[#0B7A55]/30 bg-[#EAF5EF] p-6 space-y-3 shadow-card">
            <div className="flex items-center gap-2 text-[#0B7A55] font-bold text-sm font-heading">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              <span>Instant WhatsApp Desk</span>
            </div>
            <p className="text-xs text-[#14201B] leading-relaxed">
              Have a design code, photo, or architect drawing? Chat directly with our surface material experts for instant stock verification and price quotes.
            </p>
            <a
              href="https://wa.me/919876543210?text=Hi%20Lammart%20Team%2C%20I%20have%20an%20enquiry%20regarding%20materials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs"
            >
              <MessageCircle className="h-4 w-4 fill-white" />
              <span>Chat on WhatsApp (+91 98765 43210)</span>
            </a>
          </div>

          {/* Showroom & Logistics Address */}
          <div className="rounded-16 border border-[#E7E2D9] bg-white p-6 space-y-4 shadow-card">
            <h3 className="font-bold font-heading text-[#14201B] text-sm border-b border-[#E7E2D9] pb-2">
              Physical Showroom Details
            </h3>

            <div className="space-y-3 text-xs text-[#5B6660]">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#0B7A55] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#14201B] block">Lammart Surfaces Pvt. Ltd.</strong>
                  <span>Ground Floor, Trade Center, S.G. Highway, Bodakdev, Ahmedabad, Gujarat — 380054</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <div>
                  <strong className="text-[#14201B] block">Operating Hours</strong>
                  <span>Mon – Sat: 9:00 AM – 8:00 PM (Sunday Closed)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <div>
                  <strong className="text-[#14201B] block">Showroom Direct Line</strong>
                  <span>+91 98765 43210</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <div>
                  <strong className="text-[#14201B] block">Email Support</strong>
                  <span>support@lammart.com</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1 border-t border-[#E7E2D9]">
                <ShieldCheck className="h-4 w-4 text-[#0B7A55] shrink-0" />
                <div>
                  <strong className="text-[#14201B] block">Tax &amp; Legal Entity</strong>
                  <span>GSTIN: 24AAACL1234D1Z2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Contact Form (7 cols) */}
        <div className="lg:col-span-7 rounded-16 border border-[#E7E2D9] bg-white p-6 sm:p-8 shadow-card">
          <h2 className="text-lg font-bold font-heading text-[#14201B] mb-1">Send Us a Direct Message</h2>
          <p className="text-xs text-[#5B6660] mb-6">
            Fill in your project or material requirement below. Our dispatch desk in Ahmedabad will get back to you within 2 business hours.
          </p>
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
