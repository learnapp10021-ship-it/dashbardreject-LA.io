/** Bungkus kartu: judul, legenda opsional, keterangan, lalu isi. */
export default function Card({ judul, keterangan, legenda, children }) {
  return (
    <div className="card">
      <div className="card__head">
        <h3 className="card__title">{judul}</h3>
        {legenda && (
          <div className="legend">
            {legenda.map((l) => (
              <span key={l.n}>
                <i style={{ background: l.c }} />
                {l.n}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="card__cap">{keterangan || ''}</div>
      <div className="card__body">{children}</div>
    </div>
  );
}
