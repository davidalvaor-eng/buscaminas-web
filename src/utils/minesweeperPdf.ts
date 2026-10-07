import { jsPDF } from "jspdf";
import { DIFFICULTIES, type Board, type Difficulty, type Position } from "./minesweeper";

type RGB = [number, number, number];

const COLORS = {
  paper: [245, 243, 235] as RGB,
  ink: [39, 51, 43] as RGB,
  green: [62, 119, 82] as RGB,
  line: [198, 199, 187] as RGB,
  covered: [218, 220, 207] as RGB,
  revealed: [251, 249, 241] as RGB,
  mine: [242, 220, 208] as RGB,
};

const NUMBER_COLORS: Record<number, RGB> = {
  1: [55, 100, 158],
  2: [61, 127, 83],
  3: [188, 78, 57],
  4: [82, 70, 149],
  5: [155, 71, 75],
  6: [51, 126, 132],
  7: [48, 48, 48],
  8: [112, 112, 112],
};

function selectStartingClues(board: Board): Set<string> {
  const candidates: Position[] = [];
  const selected: Position[] = [];
  const size = board.length;
  const target = Math.round(size * size * 0.24);

  board.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (!cell.mine && cell.adjacent > 0) candidates.push({ row, col });
    });
  });

  while (selected.length < target && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    candidates.forEach((position, index) => {
      const distance = selected.length
        ? Math.min(
            ...selected.map(
              (chosen) => Math.abs(position.row - chosen.row) + Math.abs(position.col - chosen.col),
            ),
          )
        : size;
      const score = distance * 1.25 + board[position.row][position.col].adjacent * 0.65 + Math.random();

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    selected.push(candidates.splice(bestIndex, 1)[0]);
  }

  // Add a nearby clue when possible so every mine has at least one printed reference.
  board.forEach((line, row) => {
    line.forEach((cell, col) => {
      if (!cell.mine) return;

      const hasReference = selected.some(
        (clue) => Math.abs(clue.row - row) <= 1 && Math.abs(clue.col - col) <= 1,
      );
      if (hasReference) return;

      const nearbyClue = candidates
        .filter((candidate) => Math.abs(candidate.row - row) <= 1 && Math.abs(candidate.col - col) <= 1)
        .sort(
          (first, second) =>
            board[second.row][second.col].adjacent - board[first.row][first.col].adjacent,
        )[0];

      if (nearbyClue) {
        selected.push(nearbyClue);
        candidates.splice(candidates.indexOf(nearbyClue), 1);
      }
    });
  });

  return new Set(selected.map(({ row, col }) => `${row}-${col}`));
}

function drawPageBase(doc: jsPDF, pageNumber: number): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.paper);
  doc.rect(0, 0, width, height, "F");
  doc.setFillColor(...COLORS.green);
  doc.rect(0, 0, 9, height, "F");

  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.7);
  doc.line(52, height - 56, width - 52, height - 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.green);
  doc.text("CAMPO MINADO  /  CUADERNO DE JUEGO", 52, height - 35);
  doc.setTextColor(...COLORS.ink);
  doc.text(`${String(pageNumber).padStart(2, "0")}  /  02`, width - 52, height - 35, {
    align: "right",
  });
}

function drawMine(doc: jsPDF, centerX: number, centerY: number, cellSize: number): void {
  const radius = cellSize * 0.17;
  const spokeLength = cellSize * 0.29;

  doc.setDrawColor(...COLORS.ink);
  doc.setLineWidth(Math.max(1, cellSize * 0.035));
  for (let spoke = 0; spoke < 8; spoke += 1) {
    const angle = (Math.PI * spoke) / 4;
    doc.line(
      centerX + Math.cos(angle) * radius * 0.82,
      centerY + Math.sin(angle) * radius * 0.82,
      centerX + Math.cos(angle) * spokeLength,
      centerY + Math.sin(angle) * spokeLength,
    );
  }

  doc.setFillColor(...COLORS.ink);
  doc.circle(centerX, centerY, radius, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(centerX - radius * 0.35, centerY - radius * 0.35, radius * 0.22, "F");
}

function drawBoard(
  doc: jsPDF,
  board: Board,
  startingClues: Set<string>,
  mode: "puzzle" | "solution",
  x: number,
  y: number,
  cellSize: number,
): void {
  const isSolution = mode === "solution";

  board.forEach((line, row) => {
    line.forEach((cell, col) => {
      const isHint = startingClues.has(`${row}-${col}`);
      const isKnown = isSolution || isHint;
      const cellX = x + col * cellSize;
      const cellY = y + row * cellSize;

      if (isSolution && cell.mine) {
        doc.setFillColor(...COLORS.mine);
      } else {
        doc.setFillColor(...(isKnown ? COLORS.revealed : COLORS.covered));
      }

      doc.setDrawColor(...COLORS.paper);
      doc.setLineWidth(1.2);
      doc.rect(cellX, cellY, cellSize, cellSize, "FD");

      if (isSolution && cell.mine) {
        drawMine(doc, cellX + cellSize / 2, cellY + cellSize / 2, cellSize);
      } else if (isKnown && cell.adjacent > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.min(cellSize * 0.47, 17));
        doc.setTextColor(...(NUMBER_COLORS[cell.adjacent] ?? COLORS.ink));
        doc.text(String(cell.adjacent), cellX + cellSize / 2, cellY + cellSize * 0.66, {
          align: "center",
        });
      }
    });
  });
}

export function downloadMinesweeperPdf(board: Board, difficulty: Difficulty): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const size = board.length;
  const { label, mines } = DIFFICULTIES[difficulty];
  const cellSize = Math.min(46, (width - 104) / size);
  const boardSize = size * cellSize;
  const boardX = (width - boardSize) / 2;
  const boardY = 225;
  const startingClues = selectStartingClues(board);

  doc.setProperties({ title: `Campo minado - ${label}`, author: "Campo minado" });

  drawPageBase(doc, 1);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.green);
  doc.text("PASATIEMPO DE LÓGICA  /  " + label.toUpperCase(), 52, 54);
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.ink);
  doc.text("Campo minado", 52, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Encuentra las minas. Cada número cuenta las que hay alrededor.", 52, 126);

  doc.setDrawColor(...COLORS.line);
  doc.line(52, 151, width - 52, 151);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text(`DIFICULTAD: ${label.toUpperCase()}`, 52, 177);
  doc.text(`TABLERO: ${size} x ${size}`, width / 2, 177, { align: "center" });
  doc.text(`MINAS: ${mines}`, width - 52, 177, { align: "right" });

  drawBoard(doc, board, startingClues, "puzzle", boardX, boardY, cellSize);

  const noteY = boardY + boardSize + 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  doc.text("Marca las minas. Las cifras impresas son tus pistas iniciales.", 52, noteY);
  doc.setDrawColor(...COLORS.line);
  doc.line(52, noteY + 21, width - 52, noteY + 21);
  doc.setFontSize(9);
  doc.setTextColor(109, 111, 101);
  doc.text("Nombre  __________________________________", 52, noteY + 42);
  doc.text("Fecha  __________________", width - 52, noteY + 42, { align: "right" });

  doc.addPage("a4", "portrait");
  drawPageBase(doc, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.green);
  doc.text("CLAVE DE RESPUESTAS", 52, 54);
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.ink);
  doc.text("Solución", 52, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Guarda esta página fuera de la vista mientras resuelves el tablero.", 52, 126);

  doc.setDrawColor(...COLORS.line);
  doc.line(52, 151, width - 52, 151);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text(`${size} x ${size}  /  ${mines} MINAS`, 52, 177);

  drawBoard(doc, board, startingClues, "solution", boardX, boardY, cellSize);

  const solutionNoteY = boardY + boardSize + 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  doc.text("Las casillas rojas contienen minas. Los números muestran todas las pistas.", 52, solutionNoteY);

  doc.save(`campo-minado-${difficulty}.pdf`);
}