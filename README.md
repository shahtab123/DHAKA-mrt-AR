# Dhaka Metro AR Map

Point your phone at a **printed AR card**. The full Dhaka MRT map (lines + station labels from the [Wikipedia SVG](https://en.wikipedia.org/wiki/File:Dhaka_MRT_Network_(en).svg)) appears floating above the card.

![Dhaka MRT network map](assets/dhaka-metro-map.png)

Built with [A-Frame 1.6.0](https://aframe.io/) + [MindAR 1.2.5](https://github.com/hiukim/mind-ar-js).

---

## Step 1 — Install

```bash
cd dhaka-ar-metro
npm install
```

---

## Step 2 — Build the AR card image

This creates `assets/ar-card.png` with a QR code pointing to your PC on the network.

```bash
npm run export-card
```

The QR URL is saved in `assets/ar-card-url.txt`.

---

## Step 3 — Start the HTTPS server

Camera access on your phone **requires HTTPS**. Keep this running.

```bash
npm run serve:https
```

The terminal prints a URL like `https://192.168.x.x:3443/index.html`.

---

## Step 4 — Compile the tracking file

Do this on your **PC** (not the phone).

1. Open **https://localhost:3443/compile-target.html** in Chrome.
2. Click **Compile assets/ar-card.png**.
3. Wait 30–60 seconds until you see **SUCCESS — targets.mind saved**.
4. If the page says the server is not running, go back to Step 3.

You only need to compile again if you change `assets/ar-card.png` (new QR, new design, reprint).

---

## Step 5 — Print the card

| | |
|---|---|
| **File to print** | `assets/ar-card.png` |
| **Shape** | Landscape (wider than tall) |
| **Recommended size** | **A6 landscape** (~148 × 105 mm) or **postcard** (~6 × 4 in) |
| **Minimum size** | About credit-card size — works, but tracking is weaker |
| **Paper** | Matte cardstock or photo paper (avoid glossy) |
| **Tips** | Print at 100% scale — do not crop the QR. Print a few copies for testing. |

The card is only for **tracking**. The metro map is shown in AR above it — you do not print the full map.

---

## Step 6 — Open AR on your phone

1. Phone and PC on the **same Wi‑Fi**.
2. Open the URL from Step 3, or scan the QR on the printed card.
3. **First visit:** Chrome → **Advanced** → **Proceed** (self-signed certificate is normal).
4. Tap **Allow** for camera access.
5. Use **Chrome on Android** (Safari on iOS has limited Web AR support).
6. Point the camera at the printed card. Pinch or use **+/−** to zoom the map.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection not secure | Use `npm run serve:https`, not plain `http://` |
| Browser not compatible | Use Chrome on Android; avoid in-app browsers (WhatsApp, Facebook) |
| Camera never asks | Must be HTTPS; accept the certificate warning first |
| Map does not stick to card | Recompile at https://localhost:3443/compile-target.html |
| QR opens wrong URL | Run `npm run export-card` again, reprint, recompile |

---

## Optional — regenerate map overlay

If you update `assets/dhaka-metro-map.svg`:

```bash
npm run export-overlay
```

Refresh the AR page. No need to recompile `targets.mind` unless the **card** image changed.

---

## Project files

```
dhaka-ar-metro/
├── index.html              AR app (open on phone)
├── compile-target.html     Compile ar-card.png → targets.mind (open on PC)
├── targets.mind            Tracking data (created in Step 4)
├── assets/
│   ├── ar-card.png         Print this
│   ├── ar-card.svg         Card design (edit before export-card)
│   ├── dhaka-metro-map.svg Wikipedia map source
│   └── dhaka-metro-overlay.png  Map shown in AR
└── scripts/
    ├── export-card.js
    ├── export-map-overlay.js
    └── serve-https.js
```

---

## Licence

Network map SVG © Wikimedia Commons (CC BY-SA 4.0). AR code: open source.
