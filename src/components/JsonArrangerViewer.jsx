// src/components/JsonArrangerViewer.js
import React, { useEffect, useMemo, useState } from "react";

/*
  Props:
    - initialData: object (imported JSON) OR
    - (optional) url: string to fetch JSON instead (if you prefer runtime loading)
  This version prefers initialData when provided.
*/

export default function JsonArrangerViewer({ initialData = null, url = null }) {
  const [dataObj, setDataObj] = useState(() =>
    initialData ? structuredClone(initialData) : null
  );
  const [activeKey, setActiveKey] = useState(null);
  const [search, setSearch] = useState("");
  const [sortSpec, setSortSpec] = useState({ key: null, dir: 1 });

  // If url provided (runtime fetch) and no initialData, fetch it

  useEffect(() => {
    fetch("https://jsonplaceholder.typicode.com/posts") // your API URL
      .then((response) => response.json())
      .then((json) => {
        setData(json); // store the data
        console.log(json);
      })
      .catch((err) => console.error(err));

    let mounted = true;
    if (!initialData && url) {
      fetch(url, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then((json) => {
          if (mounted) {
            setDataObj(json);
            const first = Object.keys(json || {})[0];
            setActiveKey(first || null);
          }
        })
        .catch((err) => console.error("Failed to load JSON:", err));
    } else if (initialData) {
      setDataObj(structuredClone(initialData));
      const first = Object.keys(initialData || {})[0];
      setActiveKey(first || null);
    }
    return () => {
      mounted = false;
    };
  }, [initialData, url]);

  const keys = useMemo(() => (dataObj ? Object.keys(dataObj) : []), [dataObj]);

  function aggregateByData(arr) {
    const map = new Map();
    for (const it of arr) {
      if (!it || typeof it !== "object" || !("data" in it)) continue;
      const d = String(it.data);
      if (!map.has(d)) map.set(d, { ...it });
      else {
        const cur = map.get(d);
        if ("cnt" in it) cur.cnt = (cur.cnt || 0) + (it.cnt || 0);
        if ("lvl" in it) cur.lvl = Math.max(cur.lvl || 0, it.lvl || 0);
        if ("timer" in it) {
          if (!("timer" in cur) || (it.timer && it.timer < cur.timer))
            cur.timer = it.timer;
        }
        if ("helper_recurrent" in it)
          cur.helper_recurrent = cur.helper_recurrent || it.helper_recurrent;
        for (const k of Object.keys(it)) if (!(k in cur)) cur[k] = it[k];
        map.set(d, cur);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => Number(a.data) - Number(b.data)
    );
  }

  function handleAggregateAll() {
    if (!dataObj) return;
    const out = { ...dataObj };
    for (const k of Object.keys(out)) {
      if (!Array.isArray(out[k])) continue;
      if (!out[k].some((it) => it && typeof it === "object" && "data" in it))
        continue;
      out[k] = aggregateByData(out[k]);
    }
    setDataObj(out);
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(dataObj, null, 2)], {
      type: "application/json",
    });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlObj;
    a.download = "arranged.json";
    a.click();
    URL.revokeObjectURL(urlObj);
  }

  function renderTableForKey(key) {
    const raw = dataObj?.[key];
    if (raw === undefined)
      return <div style={{ padding: 12 }}>Key not present</div>;

    if (Array.isArray(raw) && raw.every((x) => typeof x !== "object")) {
      return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>index</th>
              <th style={{ border: "1px solid #ddd", padding: 6 }}>value</th>
            </tr>
          </thead>
          <tbody>
            {raw.map((v, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #eee", padding: 6 }}>{i}</td>
                <td style={{ border: "1px solid #eee", padding: 6 }}>
                  {String(v)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (Array.isArray(raw) && raw.length && typeof raw[0] === "object") {
      const cols = new Set();
      raw.forEach((r) => {
        if (r && typeof r === "object")
          Object.keys(r).forEach((k) => cols.add(k));
      });
      const colArr = Array.from(cols);
      const orderedCols = colArr.includes("data")
        ? ["data", ...colArr.filter((c) => c !== "data")]
        : colArr;

      const q = (search || "").toLowerCase().trim();
      let rows = raw.map((r) => r || {});
      if (q)
        rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));

      if (sortSpec.key) {
        const k = sortSpec.key,
          dir = sortSpec.dir;
        rows.sort((a, b) => {
          const va = a && k in a ? a[k] : null;
          const vb = b && k in b ? b[k] : null;
          const na =
            typeof va === "number" || (!isNaN(Number(va)) && va !== null)
              ? Number(va)
              : null;
          const nb =
            typeof vb === "number" || (!isNaN(Number(vb)) && vb !== null)
              ? Number(vb)
              : null;
          if (na !== null && nb !== null) return (na - nb) * dir;
          const sa = va === null || va === undefined ? "" : String(va);
          const sb = vb === null || vb === undefined ? "" : String(vb);
          return sa.localeCompare(sb) * dir;
        });
      } else if (orderedCols.includes("data")) {
        rows.sort((a, b) => Number(a.data || 0) - Number(b.data || 0));
      }

      return (
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {orderedCols.map((col) => (
                  <th
                    key={col}
                    onClick={() =>
                      setSortSpec((s) =>
                        s.key === col
                          ? { key: col, dir: -s.dir }
                          : { key: col, dir: 1 }
                      )
                    }
                    style={{
                      border: "1px solid #ddd",
                      padding: 6,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    {col}{" "}
                    {sortSpec.key === col
                      ? sortSpec.dir === 1
                        ? "▲"
                        : "▼"
                      : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  {orderedCols.map((col) => (
                    <td
                      key={col}
                      style={{
                        border: "1px solid #eee",
                        padding: 6,
                        whiteSpace: "pre",
                      }}
                    >
                      {r[col] === undefined
                        ? ""
                        : typeof r[col] === "object"
                        ? JSON.stringify(r[col])
                        : String(r[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <pre style={{ padding: 12 }}>{JSON.stringify(raw, null, 2)}</pre>;
  }

  return (
    <div
      style={{ display: "flex", gap: 16, padding: 12, fontFamily: "system-ui" }}
    >
      <div style={{ width: 260 }}>
        <h3>Categories</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => {
                setActiveKey(k);
                setSortSpec({ key: null, dir: 1 });
              }}
              style={{
                textAlign: "left",
                padding: 8,
                background: activeKey === k ? "#e8f0ff" : "#fff",
                border: "12px solid #ddd",
              }}
            >
              {k}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button onClick={handleAggregateAll} style={{ padding: 8 }}>
            Aggregate duplicates
          </button>
          <button onClick={handleDownload} style={{ padding: 8 }}>
            Download JSON
          </button>
        </div>

        <div style={{ marginTop: 12, color: "#666" }}>
          <div>Tag: {dataObj?.tag ?? "—"}</div>
          <div>Timestamp: {dataObj?.timestamp ?? "—"}</div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <input
            placeholder="filter rows (contains)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: 8, width: 380 }}
          />
          <div style={{ color: "#666" }}>Loaded keys: {keys.length}</div>
        </div>

        <div style={{ border: "1px solid #eee", padding: 8, marginTop: 8 }}>
          {activeKey ? (
            renderTableForKey(activeKey)
          ) : (
            <div style={{ padding: 12, color: "#666" }}>
              No category selected
            </div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Raw JSON</h4>
          <textarea
            style={{
              width: "100%",
              height: 240,
              fontFamily: "monospace",
              padding: 8,
            }}
            value={JSON.stringify(dataObj ?? {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setDataObj(parsed);
              } catch (err) {
                // allow live editfing without crashing
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
