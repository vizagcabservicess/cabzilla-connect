# Backend Performance Improvements for Vehicle Pages

This guide outlines backend/CDN changes to improve LCP, FCP, and overall Lighthouse scores for vehicle detail pages (e.g. `/vehicle/innova-crysta`).

---

## 1. Image Optimization (~3–5s LCP improvement)

### Problem
Vehicle images (e.g. `innova-crysta-in-vizag-taxi-hub-scaled.jpg`) are often 2560px+ wide and several hundred KB. The LCP image loads slowly on mobile.

### Solutions

**A. Serve resized images**
- Add URL params: `?w=800` or `?w=800&q=80` to request display-sized images
- Example: `/wp-content/uploads/2021/08/innova-crysta.jpg?w=800&q=80`
- Many CMS/CDNs support this (WordPress, Cloudflare Images, imgix, etc.)

**B. Use next-gen formats**
- Convert and serve WebP or AVIF
- Add content negotiation or use `.webp` URLs
- Typical savings: 30–50% smaller than JPEG

**C. CDN + image transformation**
- Use Cloudflare Polish, Cloudinary, or imgix to resize/optimize on-the-fly
- Cache transformed images at the edge

---

## 2. API Response Caching

### Problem
Vehicle data (`/api/admin/get-vehicles.php`, etc.) may not be cached, adding latency.

### Solutions
- Add `Cache-Control: public, max-age=300` (5 min) for vehicle list/detail
- Use CDN caching for GET requests
- Consider edge caching for `/api/` endpoints that return public data

---

## 3. Document/HTML Caching

### Problem
Initial HTML may have poor cache headers.

### Solutions
- Ensure `Cache-Control` headers on HTML/document
- For static routes, consider short cache (e.g. 60s) or stale-while-revalidate

---

## 4. Preconnect/DNS for Image Origin

### Already done (frontend)
- `preconnect` to vizagtaxihub.com
- Limited to 4 preconnects to avoid overhead

### Backend
- Ensure images are served from same domain or a fast CDN
- Avoid redirect chains (e.g. www → non-www) for image URLs

---

## Frontend (already implemented)

The app uses `getOptimizedImageUrl()` to append `?w=800&q=80` to vizagtaxihub.com image URLs. **Disabled by default** until backend supports these params.

**Enable** when backend is ready: set `VITE_IMAGE_OPTIMIZATION=true` in `.env`.

---

## Quick Wins Checklist

| Change | Est. impact | Effort |
|--------|-------------|--------|
| Resize images to ~800px | High (LCP) | Low |
| Add WebP/AVIF support | Medium | Medium |
| Cache vehicle API (5 min) | Medium | Low |
| CDN for static assets | Medium | Low |

---

## Testing

After backend changes:
1. Run Lighthouse on `/vehicle/innova-crysta` (Mobile, Slow 4G)
2. Check Network tab: image sizes and response times
3. Target: LCP < 2.5s, Performance score > 90
