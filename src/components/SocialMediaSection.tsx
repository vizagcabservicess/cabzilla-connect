import React from 'react';
import { FaAndroid, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { IconX } from '@/components/IconX';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.vizagtaxihub.app';

export function SocialMediaSection() {
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/vizagtaxihub',
      tile: 'bg-[#1877F2]',
      icon: FaFacebook,
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/vizagtaxihub/',
      tile: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]',
      icon: FaInstagram,
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urr',
      tile: 'bg-[#FF0000]',
      icon: FaYoutube,
    },
    {
      name: 'X',
      url: 'https://twitter.com/vizagtaxihub',
      tile: 'bg-[#111111]',
      icon: IconX,
    },
  ] as const;

  return (
    <section className="home-section-band--soft px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-5 max-w-2xl text-center">
          <span className="home-section-eyebrow mb-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.07em]">
            Join us
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[1.75rem]">
            Follow Our Journey
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 md:text-xs">
            Get updates, trip stories, offers and travel tips with Vizag Taxi Hub
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-slate-200/80 bg-white px-4 py-5 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white ${social.tile}`}
              >
                <social.icon className="h-6 w-6 text-2xl" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{social.name}</h3>
              <span className="mt-0.5 inline-flex text-sm font-medium text-[#0066FF]">Follow →</span>
            </a>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-white via-emerald-50/80 to-emerald-100/70 px-4 py-4 text-center">
          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-emerald-100"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M0 70c180 40 320-30 520-10s360 50 680-20v80H0V70z"
            />
            <path
              fill="rgb(167 243 208)"
              fillOpacity="0.55"
              d="M0 90c220-30 380 30 620 10s360-40 580 10v20H0V90z"
            />
          </svg>
          <FaAndroid
            className="pointer-events-none absolute -right-1 bottom-0 text-7xl text-emerald-300/50"
            aria-hidden
          />

          <div className="relative">
            <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#3DDC84] shadow-sm">
              <FaAndroid className="text-base text-white" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Get Our Android App</h3>
            <p className="mx-auto mt-0.5 max-w-md text-xs text-slate-600">
              Book and track your rides on the go. Available now on Google Play.
            </p>
            <div className="mt-3 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
                className="inline-flex transition-transform hover:scale-[1.02]"
              >
                <img
                  src="/google-play-badge.svg"
                  alt="Get it on Google Play"
                  className="h-10 w-auto"
                />
              </a>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Scan to download the Android app on Google Play"
                className="flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 shadow-sm"
              >
                <img
                  src="/vizag-play-qr.svg"
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14"
                />
                <span className="pr-1 text-left text-[11px] font-semibold leading-tight text-slate-700">
                  Scan to
                  <br />
                  download
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
