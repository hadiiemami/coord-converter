# Coordinate Converter 🌍

A modern web-based coordinate converter with an interactive OpenStreetMap (OSM) map interface.  
This tool allows you to convert coordinates between multiple formats including:

- **DD** (Decimal Degrees)
- **DMS** (Degrees, Minutes, Seconds)
- **DDM** (Degrees & Decimal Minutes)
- **UTM** (Universal Transverse Mercator)

You can either:
- Enter coordinates manually, or  
- Click directly on the map to get the location instantly.

---

## 🎥 Demo

Here’s a quick demo of the application in action:

![Demo](coord-converter/Intro.gif)

---

## 🚀 Features

- Interactive OpenStreetMap (via Leaflet)
- Coordinate conversion between multiple formats
- Copy-to-clipboard for outputs
- Light/Dark theme toggle
- Clean and modern UI built with **HTML, CSS, and JavaScript**
- Uses **Proj4.js** for UTM/WGS84 conversions

---

## 📂 Project Structure

```bash
coord-converter/
│
├── index.html          # Main entry point
├── assets/
│   ├── css/
│   │   └── style.css   # Styling
│   └── js/
│       └── app.js      # Main application logic
└── Intro.gif           # Demo GIF
```

---

## ⚡ How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/hadiiemami/coord-converter.git
   cd coord-converter
   ```

2. Start a simple local server (Python 3):
   ```bash
   python -m http.server 8000
   ```

3. Open your browser at:
   ```
   http://localhost:8000
   ```

---

## 🌐 Live Demo (GitHub Pages)

👉 [Try it online here](https://hadiiemami.github.io/coord-converter/)

---

## 📜 License

This project is licensed under the **MIT License**.  
Feel free to use, modify, and share.

---

✨ Built with ❤️ using **Leaflet + OpenStreetMap**
