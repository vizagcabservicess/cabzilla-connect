
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				/** Vizag Taxi Hub brand blue */
				blue: {
					50: '#EEF4FF',
					100: '#E8F0FE',
					200: '#C7DAFE',
					300: '#94B8FF',
					400: '#5C94FF',
					500: '#0066FF',
					600: '#0066FF',
					700: '#0052CC',
					800: '#0047AB',
					900: '#003D99',
					950: '#002966',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				cabBlue: {
					50: '#fdf2f6',
					100: '#fce7ef',
					200: '#f9cede',
					300: '#f3a6c2',
					400: '#e8719a',
					500: '#97144D',
					600: '#861F41',
					700: '#6b1833',
					800: '#4f1126',
					900: '#3a0c1c',
				},
				cabGray: {
					50: '#F9FAFB',
					100: '#F5F5F7',
					200: '#E5E7EB',
					300: '#D1D5DB',
					400: '#9CA3AF',
					500: '#6B7280',
					600: '#4B5563',
					700: '#374151',
					800: '#1F2937',
					900: '#111827',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				},
				'fade-out': {
					from: {
						opacity: '1'
					},
					to: {
						opacity: '0'
					}
				},
				'slide-up': {
					from: {
						transform: 'translateY(1rem)',
						opacity: '0'
					},
					to: {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'slide-down': {
					from: {
						transform: 'translateY(-1rem)',
						opacity: '0'
					},
					to: {
						transform: 'translateY(0)',
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'slide-down': 'slide-down 0.4s ease-out'
			},
			boxShadow: {
				'card': '0px 4px 16px 0px rgba(0, 0, 0, 0.04), 0px 2px 4px 0px rgba(0, 0, 0, 0.01)',
				'elevated': '0px 10px 40px 0px rgba(0, 0, 0, 0.08), 0px 4px 12px 0px rgba(0, 0, 0, 0.05)',
				'button': '0px 2px 6px 0px rgba(134, 31, 65, 0.15)',
			},
			backdropBlur: {
				'xs': '2px',
			},
			height: {
				'screen-minus-header': 'calc(100vh - 4rem)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
