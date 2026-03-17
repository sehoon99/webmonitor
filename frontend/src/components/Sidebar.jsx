export default function Sidebar({ targets, selectedTarget, statusMap, onSelect, onRemove }) {
  return (
    <>
      <div className="sidebar-title">모니터링 목록</div>
      <div className="sidebar-list">
        {targets.length === 0 ? (
          <div className="sidebar-empty">
            상단 검색창에<br />URL을 입력하세요
          </div>
        ) : (
          targets.map((target) => {
            const status = statusMap?.[target];
            const hostname = (() => {
              try { return new URL(target).hostname; } catch { return target; }
            })();

            return (
              <div
                key={target}
                className={`sidebar-item ${selectedTarget === target ? 'active' : ''}`}
                onClick={() => onSelect(target)}
              >
                <div
                  className={`sidebar-status ${
                    status === 1 ? 'up' : status === 0 ? 'down' : ''
                  }`}
                />
                <span className="sidebar-name" title={target}>{hostname}</span>
                <button
                  className="sidebar-remove"
                  title="제거"
                  onClick={(e) => { e.stopPropagation(); onRemove(target); }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
