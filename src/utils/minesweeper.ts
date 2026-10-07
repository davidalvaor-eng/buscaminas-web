export type Difficulty = "facil" | "medio" | "dificil";

export type DifficultySettings = {
  label: string;
  rows: number;
  mines: number;
};

export const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  facil: { label: "Fácil", rows: 8, mines: 10 },
  medio: { label: "Medio", rows: 10, mines: 16 },
  dificil: { label: "Difícil", rows: 12, mines: 24 },
};

export type Position = { row: number; col: number };

export type Cell = {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
  exploded?: boolean;
};

export type Board = Cell[][];

export function createBoard(difficulty: Difficulty, safeStart?: Position): Board {
  const { rows, mines } = DIFFICULTIES[difficulty];
  const available: Position[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < rows; col += 1) {
      const isNearFirstClick =
        safeStart && Math.abs(row - safeStart.row) <= 1 && Math.abs(col - safeStart.col) <= 1;

      if (!isNearFirstClick) available.push({ row, col });
    }
  }

  for (let index = available.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
  }

  const minePositions = new Set(
    available.slice(0, mines).map(({ row, col }) => `${row}-${col}`),
  );

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: rows }, (_, col) => {
      const mine = minePositions.has(`${row}-${col}`);
      let adjacent = 0;

      for (let neighborRow = row - 1; neighborRow <= row + 1; neighborRow += 1) {
        for (let neighborCol = col - 1; neighborCol <= col + 1; neighborCol += 1) {
          if (
            neighborRow >= 0 &&
            neighborRow < rows &&
            neighborCol >= 0 &&
            neighborCol < rows &&
            minePositions.has(`${neighborRow}-${neighborCol}`)
          ) {
            adjacent += 1;
          }
        }
      }

      return { mine, adjacent, revealed: false, flagged: false };
    }),
  );
}

export function revealRegion(
  board: Board,
  startRow: number,
  startCol: number,
): { board: Board; explodedAt: Position | null } {
  const next = board.map((line) => line.map((cell) => ({ ...cell })));
  const queue: Position[] = [{ row: startRow, col: startCol }];
  const visited = new Set<string>();

  // Expands empty areas while keeping numbered cells as the edge of the reveal.
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const { row, col } = current;
    const key = `${row}-${col}`;
    const cell = next[row]?.[col];

    if (!cell || visited.has(key) || cell.revealed || cell.flagged) continue;
    visited.add(key);
    cell.revealed = true;

    if (cell.mine) return { board: next, explodedAt: { row, col } };

    if (cell.adjacent === 0) {
      for (let neighborRow = row - 1; neighborRow <= row + 1; neighborRow += 1) {
        for (let neighborCol = col - 1; neighborCol <= col + 1; neighborCol += 1) {
          if (neighborRow !== row || neighborCol !== col) {
            queue.push({ row: neighborRow, col: neighborCol });
          }
        }
      }
    }
  }

  return { board: next, explodedAt: null };
}

export function hasWon(board: Board, mineCount: number): boolean {
  const revealedSafeCells = board.flat().filter((cell) => cell.revealed && !cell.mine).length;
  return revealedSafeCells === board.length * board.length - mineCount;
}