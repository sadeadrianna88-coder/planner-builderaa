"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fabric } from "fabric";
import jsPDF from "jspdf";

const PAGE_W = 900;
const PAGE_H = 1200;

function makeEmptyPage() {
  return { id: crypto.randomUUID(), json: null, preview: null };
}

export default function PlannerEditor() {
  const canvasEl = useRef(null);
  const fabricRef = useRef(null);

  const [pages, setPages] = useState([makeEmptyPage()]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activePage = pages[activeIndex];

  const stickers = useMemo(
    () => [
      "/stickers/sticker1.png",
      "/stickers/sticker2.png",
      "/stickers/sticker3.png",
    ],
    []
  );

  useEffect(() => {
    const c = new fabric.Canvas(canvasEl.current, {
      width: PAGE_W,
      height: PAGE_H,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });

    fabric.Object.prototype.transparentCorners = false;
    fabricRef.current = c;

    const save = () => saveCurrentPage();
    c.on("object:added", save);
    c.on("object:modified", save);
    c.on("object:removed", save);

    return () => c.dispose();
  }, []);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;

    c.clear();
    c.setBackgroundColor("#ffffff", () => c.renderAll());

    if (activePage?.json) {
      c.loadFromJSON(activePage.json, () => c.renderAll());
    }
  }, [activeIndex]);

  function saveCurrentPage() {
    const c = fabricRef.current;
    if (!c) return;

    const json = c.toJSON();
    const preview = c.toDataURL({ format: "png", multiplier: 0.15 });

    setPages((prev) =>
      prev.map((p, i) => (i === activeIndex ? { ...p, json, preview } : p))
    );
  }

  function addText() {
    const c = fabricRef.current;
    if (!c) return;

    const t = new fabric.Textbox("Type here", {
      left: 100,
      top: 100,
      width: 400,
      fontSize: 40,
      fill: "#111",
    });

    c.add(t);
    c.setActiveObject(t);
    c.renderAll();
  }

  function addSticker(url) {
    const c = fabricRef.current;
    if (!c) return;

    fabric.Image.fromURL(url, (img) => {
      img.set({ left: 150, top: 150, scaleX: 0.4, scaleY: 0.4 });
      c.add(img);
      c.setActiveObject(img);
      c.renderAll();
    });
  }

  function addPage() {
    saveCurrentPage();
    setPages((prev) => [...prev, makeEmptyPage()]);
    setActiveIndex(pages.length);
  }

  function deleteSelected() {
    const c = fabricRef.current;
    if (!c) return;

    const obj = c.getActiveObject();
    if (obj) {
      c.remove(obj);
      c.discardActiveObject();
      c.renderAll();
    }
  }

  async function exportPDF() {
    saveCurrentPage();
    const c = fabricRef.current;
    if (!c) return;

    const pdf = new jsPDF({
      unit: "pt",
      format: [PAGE_W, PAGE_H],
    });

    for (let i = 0; i < pages.length; i++) {
      c.clear();
      c.setBackgroundColor("#fff", () => c.renderAll());

      if (pages[i].json) {
        await new Promise((res) =>
          c.loadFromJSON(pages[i].json, () => {
            c.renderAll();
            res();
          })
        );
      }

      const img = c.toDataURL("image/png");
      if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
      pdf.addImage(img, "PNG", 0, 0, PAGE_W, PAGE_H);
    }

    pdf.save("planner.pdf");
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 260px", height: "100vh" }}>
      <aside style={{ padding: 10, borderRight: "1px solid #ddd" }}>
        <button onClick={addPage}>+ Page</button>
        {pages.map((p, i) => (
          <div
            key={p.id}
            onClick={() => setActiveIndex(i)}
            style={{
              border: i === activeIndex ? "2px solid purple" : "1px solid #ccc",
              marginTop: 10,
              height: 150,
              background: p.preview ? `url(${p.preview}) center/cover` : "#eee",
              cursor: "pointer",
            }}
          />
        ))}
      </aside>

      <main style={{ padding: 10 }}>
        <button onClick={addText}>Text</button>
        <button onClick={deleteSelected}>Delete</button>
        <button onClick={exportPDF}>Export PDF</button>
        <canvas ref={canvasEl} />
      </main>

      <aside style={{ padding: 10, borderLeft: "1px solid #ddd" }}>
        {stickers.map((s) => (
          <img
            key={s}
            src={s}
            alt=""
            style={{ width: 100, cursor: "pointer" }}
            onClick={() => addSticker(s)}
          />
        ))}
      </aside>
    </div>
  );
}
