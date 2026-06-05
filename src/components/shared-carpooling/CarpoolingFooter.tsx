import { Link } from 'react-router-dom';

import { MapPin, Phone, Mail } from 'lucide-react';

import { FaFacebook, FaInstagram, FaWhatsapp, FaYoutube } from 'react-icons/fa';

import { FOOTER_BG, BRAND_GREEN } from './constants';

import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';

import { Logo } from '@/components/Logo';



const FOOTER_LINKS = {

  Carpool: [

    { label: 'Find a Ride', href: '#find-ride' },

    { label: 'Post Commute Request', href: '#commute-form' },

    { label: 'Monthly Pass', href: '#commute-form' },

    { label: 'How It Works', href: '#how-it-works' },

    { label: 'Routes & Schedule', href: '#routes' },

  ],

  Services: [

    { label: 'Local Taxi', href: '/local-taxi' },

    { label: 'Outstation', href: '/outstation-taxi' },

    { label: 'Airport Transfer', href: '/airport-taxi' },

    { label: 'Tour Packages', href: '/tours' },

    { label: 'Group Tours', href: '/group-tours' },

  ],

  Company: [

    { label: 'Our Story', href: '/our-story' },

    { label: 'Fleet', href: '/fleet' },

    { label: 'Careers', href: '/careers' },

    { label: 'Contact Us', href: '/contact-us' },

  ],

  Support: [

    { label: 'Help Center', href: '/help-center' },

    { label: 'Terms & Conditions', href: '/terms-conditions' },

    { label: 'Privacy Policy', href: '/privacy-policy' },

    { label: 'Cancellation Policy', href: '/cancellation-refund-policy' },

  ],

} as const;



function FooterLink({ href, label }: { href: string; label: string }) {

  if (href.startsWith('/')) {

    return (

      <Link to={href} className="text-sm text-white/60 transition-colors hover:text-white">

        {label}

      </Link>

    );

  }

  return (

    <a href={href} className="text-sm text-white/60 transition-colors hover:text-white">

      {label}

    </a>

  );

}



export function CarpoolingFooter() {

  const waUrl = buildWhatsAppMeUrl('/shared-carpooling');



  return (

    <footer style={{ backgroundColor: FOOTER_BG }} className="carpooling-footer text-white">

      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">

        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr_1fr]">

          <div>

            <Logo to="/" size="small" />

            <p className="mt-3 text-xs text-white/60">UNIQUE CAR SERVICES</p>

            <p className="mt-2 text-sm text-white/70">

              Shared carpooling for daily office &amp; college commutes in Visakhapatnam.

            </p>



            <div className="mt-6 flex gap-3">

              <a

                href={waUrl}

                target="_blank"

                rel="noopener noreferrer"

                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"

                aria-label="WhatsApp"

              >

                <FaWhatsapp className="h-4 w-4" />

              </a>

              <a

                href="https://www.instagram.com/vizagtaxihub"

                target="_blank"

                rel="noopener noreferrer"

                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"

                aria-label="Instagram"

              >

                <FaInstagram className="h-4 w-4" />

              </a>

              <a

                href="https://www.facebook.com/vizagtaxihub"

                target="_blank"

                rel="noopener noreferrer"

                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"

                aria-label="Facebook"

              >

                <FaFacebook className="h-4 w-4" />

              </a>

              <a

                href="https://www.youtube.com/@vizagtaxihub"

                target="_blank"

                rel="noopener noreferrer"

                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"

                aria-label="YouTube"

              >

                <FaYoutube className="h-4 w-4" />

              </a>

            </div>

          </div>



          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">

            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (

              <div key={heading}>

                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">

                  {heading}

                </h3>

                <ul className="space-y-2.5">

                  {links.map((link) => (

                    <li key={link.label}>

                      <FooterLink href={link.href} label={link.label} />

                    </li>

                  ))}

                </ul>

              </div>

            ))}

          </div>



          <div>

            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/90">

              Contact

            </h3>

            <ul className="space-y-3 text-sm text-white/60">

              <li className="flex items-center gap-2">

                <Phone className="h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />

                <a href="tel:+919966363662" className="hover:text-white">

                  +91 9966363662

                </a>

              </li>

              <li className="flex items-center gap-2">

                <Mail className="h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />

                <a href="mailto:info@vizagtaxihub.com" className="hover:text-white">

                  info@vizagtaxihub.com

                </a>

              </li>

              <li className="flex items-start gap-2">

                <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />

                <span>Visakhapatnam, Andhra Pradesh, India</span>

              </li>

            </ul>

          </div>

        </div>



        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">

          <p>© {new Date().getFullYear()} Vizag Taxi Hub. All rights reserved.</p>

          <Link to="/" className="transition-colors hover:text-white/80">

            vizagtaxihub.com

          </Link>

        </div>

      </div>

    </footer>

  );

}


