import { useEffect, useState, type MouseEvent } from "react";
import {
  createBoard,
  DIFFICULTIES,
  hasWon,
  revealRegion,
  type Board,
  type Difficulty,
} from "./utils/minesweeper";
import { downloadMinesweeperPdf } from "./utils/minesweeperPdf";

type GameStatus = "playing" | "won" | "lost";

function FlagIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 17V3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M5.8 4.1h8.1l-1.8 3.2 1.8 3.1H5.8V4.1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M3.4 17h4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function MineIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5v4M12 17.5v4M2.5 12h4m11 0h4M5.3 5.3l2.9 2.9m7.6 7.6 2.9 2.9m0-13.4-2.9 2.9m-7.6 7.6-2.9 2.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="5.4" fill="currentColor" />
      <circle cx="10.1" cy="10.1" r="1.35" fill="white" fillOpacity=".82" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.4 7.4A6.8 6.8 0 1 0 17 11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M13.7 3.7v4.2h4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.8v9.1m0 0 3.1-3.1M10 11.9 6.9 8.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.6 13.3v3.1h12.8v-3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RevealIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2.5 10s2.6-4.3 7.5-4.3 7.5 4.3 7.5 4.3-2.6 4.3-7.5 4.3S2.5 10 2.5 10Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FaceIcon({ status }: { status: GameStatus }) {
  return (
    <svg width="30" height="30" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="14.5" fill="#F7F5EC" stroke="#BFC2B5" strokeWidth="1.5" />
      <path d="M12.1 14.3v1.1m11.8-1.1v1.1" stroke="#33473A" strokeWidth="2.2" strokeLinecap="round" />
      {status === "lost" ? (
        <path d="M12.2 24c1.5-2.1 3.4-3.1 5.8-3.1s4.3 1 5.8 3.1" stroke="#33473A" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M11.8 20.5c1.5 2.4 3.6 3.6 6.2 3.6s4.7-1.2 6.2-3.6" stroke="#33473A" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {status === "lost" && <path d="m9 9 3 3m0-3-3 3m15-3 3 3m0-3-3 3" stroke="#BC5945" strokeWidth="1.5" strokeLinecap="round" />}
      {status === "won" && <path d="m27 7 .6 1.7 1.8.6-1.8.6L27 11.7l-.6-1.8-1.8-.6 1.8-.6.6-1.7Z" fill="#D39A50" />}
    </svg>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatMineCount(count: number): string {
  if (count < 0) return `-${String(Math.abs(count)).padStart(2, "0")}`;
  return String(count).padStart(3, "0");
}

function getCellLabel(cell: Board[number][number], row: number, col: number): string {
  const position = `Fila ${row + 1}, columna ${col + 1}`;
  if (cell.revealed && cell.mine) return `${position}: mina`;
  if (cell.revealed) return `${position}: ${cell.adjacent} minas alrededor`;
  if (cell.flagged) return `${position}: marcada como mina`;
  return `${position}: oculta`;
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>("facil");
  const [board, setBoard] = useState<Board>(() => createBoard("facil"));
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [flagMode, setFlagMode] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const settings = DIFFICULTIES[difficulty];
  const flagCount = board.flat().filter((cell) => cell.flagged).length;

  useEffect(() => {
    if (!hasStarted || gameStatus !== "playing") return undefined;

    const timer = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, gameStatus]);

  function startNewGame(nextDifficulty: Difficulty = difficulty): void {
    setDifficulty(nextDifficulty);
    setBoard(createBoard(nextDifficulty));
    setGameStatus("playing");
    setFlagMode(false);
    setHasStarted(false);
    setSeconds(0);
  }

  function toggleFlag(row: number, col: number): void {
    if (gameStatus !== "playing" || board[row][col].revealed) return;

    setBoard((current) =>
      current.map((line, lineIndex) =>
        line.map((cell, cellIndex) =>
          lineIndex === row && cellIndex === col ? { ...cell, flagged: !cell.flagged } : cell,
        ),
      ),
    );
  }

  function handleTileClick(row: number, col: number): void {
    if (gameStatus !== "playing") return;
    const cell = board[row][col];

    if (flagMode) {
      toggleFlag(row, col);
      return;
    }
    if (cell.revealed || cell.flagged) return;

    const source = !hasStarted && cell.mine ? createBoard(difficulty, { row, col }) : board;
    const result = revealRegion(source, row, col);
    setHasStarted(true);

    if (result.explodedAt) {
      const lostBoard = result.board.map((line, lineIndex) =>
        line.map((nextCell, cellIndex) => ({
          ...nextCell,
          revealed: nextCell.mine || nextCell.revealed,
          exploded:
            nextCell.mine &&
            lineIndex === result.explodedAt?.row &&
            cellIndex === result.explodedAt?.col,
        })),
      );
      setBoard(lostBoard);
      setGameStatus("lost");
      return;
    }

    if (hasWon(result.board, settings.mines)) {
      setBoard(result.board.map((line) => line.map((nextCell) => ({
        ...nextCell,
        flagged: nextCell.mine || nextCell.flagged,
      }))));
      setGameStatus("won");
      return;
    }

    setBoard(result.board);
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>, row: number, col: number): void {
    event.preventDefault();
    toggleFlag(row, col);
  }

  function handlePdfDownload(): void {
    downloadMinesweeperPdf(board, difficulty);
  }

  const remainingMines = settings.mines - flagCount;
  const statusMessage =
    gameStatus === "won"
      ? `¡Campo despejado! Tiempo: ${formatTime(seconds)}.`
      : gameStatus === "lost"
        ? "¡Boom! Una mina estaba bajo esa casilla."
        : hasStarted
          ? "Sigue las pistas y señala las minas que encuentres."
          : "Haz clic para empezar. Tu primer toque siempre es seguro.";

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Campo minado, inicio">
          <span className="brand-mark"><MineIcon size={22} /></span>
          <span className="brand-name">CAMPO<br />MINADO</span>
        </a>
        <a className="header-link" href="#reglas">
          Cómo jugar <span aria-hidden="true">↘</span>
        </a>
      </header>

      <main className="main-grid" id="inicio">
        <section className="intro-copy" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-mark" /> UN CLÁSICO DE LÓGICA</div>
          <h1 id="page-title">
            <span>Campo</span>
            <span className="title-accent">minado<span className="title-period">.</span></span>
          </h1>
          <p className="intro-description">
            Lee las pistas, marca las minas y despeja el tablero. Una casilla cada vez.
          </p>

          <div className="intro-actions">
            <button className="button button-dark" type="button" onClick={() => startNewGame()}>
              <ResetIcon /> Nueva partida
            </button>
            <button className="button button-light" type="button" onClick={handlePdfDownload}>
              <DownloadIcon /> Descargar PDF
            </button>
          </div>

          <div className="difficulty-row">
            <label htmlFor="difficulty-select">Dificultad</label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={(event) => startNewGame(event.target.value as Difficulty)}
            >
              {Object.entries(DIFFICULTIES).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label} · {option.rows} × {option.rows}
                </option>
              ))}
            </select>
          </div>

          <section className="rules-note" id="reglas" aria-labelledby="rules-title">
            <div className="rules-index">01 / CÓMO JUGAR</div>
            <h2 id="rules-title">Cada número es una pista.</h2>
            <p>
              Cuenta las minas en las ocho casillas que rodean cada cifra. Usa las banderas para
              señalar dónde no debes pisar.
            </p>
            <span className="rules-footnote">Clic derecho o activa el modo bandera.</span>
          </section>
        </section>

        <section className="game-panel" aria-label="Partida de buscaminas">
          <div className="game-console">
            <div className="counter-block">
              <span>TIEMPO</span>
              <strong>{formatTime(seconds)}</strong>
            </div>
            <button
              className="face-button"
              type="button"
              onClick={() => startNewGame()}
              aria-label="Reiniciar partida"
              title="Reiniciar partida"
            >
              <FaceIcon status={gameStatus} />
            </button>
            <div className="counter-block counter-right">
              <span>MINAS</span>
              <strong>{formatMineCount(remainingMines)}</strong>
            </div>
          </div>

          <div className="board-frame">
            <div
              className="game-board"
              role="group"
              aria-label={`${settings.rows} por ${settings.rows}, ${settings.mines} minas`}
              style={{ gridTemplateColumns: `repeat(${settings.rows}, minmax(0, 1fr))` }}
            >
              {board.map((line, row) =>
                line.map((cell, col) => {
                  const cellClasses = [
                    "game-cell",
                    cell.revealed && "is-revealed",
                    cell.flagged && "is-flagged",
                    cell.exploded && "is-exploded",
                    gameStatus === "lost" && cell.flagged && !cell.mine && "is-wrong",
                    !cell.revealed && gameStatus === "playing" && "is-covered",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      className={cellClasses}
                      key={`${row}-${col}`}
                      type="button"
                      onClick={() => handleTileClick(row, col)}
                      onContextMenu={(event) => handleContextMenu(event, row, col)}
                      aria-label={getCellLabel(cell, row, col)}
                      aria-pressed={cell.flagged}
                      title={getCellLabel(cell, row, col)}
                    >
                      {cell.revealed ? (
                        cell.mine ? (
                          <MineIcon size={settings.rows > 10 ? 16 : 19} />
                        ) : cell.adjacent > 0 ? (
                          <span className={`cell-number number-${cell.adjacent}`}>{cell.adjacent}</span>
                        ) : null
                      ) : cell.flagged ? (
                        <FlagIcon size={settings.rows > 10 ? 16 : 19} />
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <div className={`game-status status-${gameStatus}`} aria-live="polite">
            <span className="status-indicator" />
            <span>{statusMessage}</span>
          </div>

          <div className="tools-row">
            <span className="tools-label">ACCIÓN</span>
            <div className="tool-buttons" role="group" aria-label="Modo del tablero">
              <button
                className={`tool-button${!flagMode ? " is-active" : ""}`}
                type="button"
                aria-pressed={!flagMode}
                onClick={() => setFlagMode(false)}
              >
                <RevealIcon /> Descubrir
              </button>
              <button
                className={`tool-button${flagMode ? " is-active" : ""}`}
                type="button"
                aria-pressed={flagMode}
                onClick={() => setFlagMode(true)}
              >
                <FlagIcon size={16} /> Bandera
              </button>
            </div>
          </div>
          <div className="board-hint">El PDF incluye el tablero para resolver y la solución.</div>
        </section>
      </main>

      <footer className="site-footer">
        <span>UN JUEGO DE PACIENCIA Y LÓGICA</span>
        <span>JUEGA EN PANTALLA O IMPRIME TU PARTIDA</span>
      </footer>
    </div>
  );
}