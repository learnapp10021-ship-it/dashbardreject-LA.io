import { useState } from 'react';
import { DIMS, nilaiUnik } from '../lib/aggregate.js';
import { BULAN } from '../lib/format.js';

const TERTUTUP_AWAL = ['warna', 'grup', 'week'];

function labelNilai(dim, v) {
  return dim === 'bln' ? BULAN[Number(v)] || v : v;
}

/** Panel kiri: tombol aksi + filter model chip per dimensi. */
export default function Sidebar({ rows, filters, onToggle, onReset, onReload, onExport }) {
  const [tertutup, setTertutup] = useState(() => new Set(TERTUTUP_AWAL));

  const lipat = (key) => {
    setTertutup((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <aside className="side">
      <div className="side__head">
        <b>PIPA REJECT</b>
        <span>Warehouse FG — LA Plant</span>
      </div>

      <div className="side__buttons">
        <button className="btn btn--primary" onClick={onReload}>Muat Ulang Data</button>
        <button className="btn" onClick={onReset}>Reset Filter</button>
        <button className="btn" onClick={onExport}>Export CSV</button>
      </div>

      {DIMS.map((d) => {
        const vals = nilaiUnik(rows, d.key);
        if (!vals.length) return null;
        const dipilih = filters[d.key];
        const n = dipilih ? dipilih.size : 0;

        return (
          <div className={`fgroup${tertutup.has(d.key) ? ' is-closed' : ''}`} key={d.key}>
            <h4 className="fgroup__head" onClick={() => lipat(d.key)}>
              {d.label}
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {n > 0 && <span className="count">{n}</span>}
                <span className="fgroup__caret">▼</span>
              </span>
            </h4>
            <div className="fgroup__body">
              {vals.map((v) => {
                const key = String(v);
                const aktif = dipilih?.has(key);
                return (
                  <div key={key}
                       className={`chip${aktif ? ' is-on' : ''}`}
                       onClick={() => onToggle(d.key, key)}>
                    {labelNilai(d.key, v)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
