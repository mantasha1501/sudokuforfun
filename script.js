document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("board");
    const numpadEl = document.getElementById("numpad");
    const timerEl = document.getElementById("timer");
    const notesBtn = document.getElementById("btn-notes");
    const hintBtn = document.getElementById("btn-hint");
    const clearBtn = document.getElementById("btn-clear");
    const newGameBtn = document.getElementById("btn-new");
    const diffSelect = document.getElementById("difficulty-select");
    const statusBox = document.getElementById("status-box");

    const baseSolution = [
        5, 3, 4, 6, 7, 8, 9, 1, 2,
        6, 7, 2, 1, 9, 5, 3, 4, 8,
        1, 9, 8, 3, 4, 2, 5, 6, 7,
        8, 5, 9, 7, 6, 1, 4, 2, 3,
        4, 2, 6, 8, 5, 3, 7, 9, 1,
        7, 1, 3, 9, 2, 4, 8, 5, 6,
        9, 6, 1, 5, 3, 7, 2, 8, 4,
        2, 8, 7, 4, 1, 9, 6, 3, 5,
        3, 4, 5, 2, 8, 6, 1, 7, 9
    ];

    let solution = [];
    let currentMap = [];
    let cellStates = Array(81).fill(null).map(() => ({ value: 0, notes: [] }));
    let selectedCellIndex = null;
    let selectedNumber = null;
    let notesMode = false;
    let timerInterval = null;
    let secondsElapsed = 0;

    let activeHintIndex = null;
    let hintStatePhase = 0; 

    function generatePuzzle() {
        solution = [...baseSolution];
        const numMapping = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let i = 0; i < 81; i++) {
            solution[i] = numMapping[solution[i] - 1];
        }

        shuffleRowsWithinBlocks();

        let cellsToKeep = 45; 
        if (diffSelect.value === "medium") cellsToKeep = 33;
        if (diffSelect.value === "hard") cellsToKeep = 24;

        currentMap = [...solution];
        let indices = [];
        for(let i=0; i<81; i++) indices.push(i);
        indices = shuffleArray(indices);

        let holesToPunch = 81 - cellsToKeep;
        for(let i = 0; i < holesToPunch; i++) {
            currentMap[indices[i]] = 0;
        }
    }

    function shuffleArray(array) {
        let arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function shuffleRowsWithinBlocks() {
        for (let i = 0; i < 3; i++) {
            let r1 = Math.floor(Math.random() * 3);
            let r2 = Math.floor(Math.random() * 3);
            swapRows(r1, r2);
            swapRows(3 + r1, 3 + r2);
            swapRows(6 + r1, 6 + r2);
        }
    }

    function swapRows(row1, row2) {
        if (row1 === row2) return;
        for (let col = 0; col < 9; col++) {
            let idx1 = row1 * 9 + col;
            let idx2 = row2 * 9 + col;
            let temp = solution[idx1];
            solution[idx1] = solution[idx2];
            solution[idx2] = temp;
        }
    }

    function initGame() {
        clearInterval(timerInterval);
        clearHintState();
        secondsElapsed = 0;
        timerEl.textContent = "00:00";
        statusBox.textContent = ">> MATRIX INITIALIZED. NEW DATA STREAM STABLE.";
        
        generatePuzzle();
        
        for(let i=0; i<81; i++) {
            cellStates[i] = {
                value: currentMap[i],
                notes: []
            };
        }

        selectedCellIndex = null;
        renderBoard();
        renderNumpad();
        startTimer();
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            secondsElapsed++;
            const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const secs = String(secondsElapsed % 60).padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function clearHintState() {
        activeHintIndex = null;
        hintStatePhase = 0;
        hintBtn.textContent = "GET HINT";
        hintBtn.style.background = "var(--accent-cyan)";
    }

    function renderBoard() {
        boardEl.innerHTML = "";
        for (let i = 0; i < 81; i++) {
            const container = document.createElement("div");
            container.classList.add("cell-container");
            if (currentMap[i] !== 0) container.classList.add("fixed");
            if (selectedCellIndex === i) container.classList.add("selected");

            if (activeHintIndex === i) {
                if (hintStatePhase === 1) {
                    container.classList.add("hint-target");
                } else if (hintStatePhase === 2) {
                    container.classList.add("hint-target-peek");
                }
            }

            const valLabel = document.createElement("div");
            valLabel.classList.add("cell-value");
            
            if (activeHintIndex === i && hintStatePhase === 2 && cellStates[i].value === 0) {
                valLabel.textContent = solution[i];
                valLabel.classList.add("hint-peek-value");
            } else {
                valLabel.textContent = cellStates[i].value !== 0 ? cellStates[i].value : "";
            }
            container.appendChild(valLabel);

            const notesGrid = document.createElement("div");
            notesGrid.classList.add("notes-grid");
            for (let n = 1; n <= 9; n++) {
                const noteCell = document.createElement("div");
                noteCell.classList.add("note-digit");
                if (cellStates[i].value === 0 && cellStates[i].notes.includes(n) && !(activeHintIndex === i && hintStatePhase === 2)) {
                    noteCell.textContent = n;
                }
                notesGrid.appendChild(noteCell);
            }
            container.appendChild(notesGrid);

            container.addEventListener("click", () => selectCell(i));
            boardEl.appendChild(container);
        }
        validateBoard();
    }

    function renderNumpad() {
        numpadEl.innerHTML = "";
        const counts = Array(10).fill(9);
        for (let i = 0; i < 81; i++) {
            if (cellStates[i].value !== 0) {
                counts[cellStates[i].value]--;
            }
        }

        for (let n = 1; n <= 9; n++) {
            const btn = document.createElement("button");
            btn.classList.add("num-btn");
            if (selectedNumber === n) btn.classList.add("selected");
            btn.innerHTML = `${n}<span class="rem-count">${Math.max(0, counts[n])}</span>`;
            
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                selectedNumber = selectedNumber === n ? null : n;
                renderNumpad();

                if (selectedCellIndex !== null) {
                    applyInputToCell(selectedCellIndex, selectedNumber);
                }
            });
            numpadEl.appendChild(btn);
        }
    }

    function selectCell(index) {
        if (currentMap[index] !== 0) return;
        
        if (activeHintIndex !== null && activeHintIndex !== index) {
            clearHintState();
            statusBox.textContent = ">> INPUT REDIRECTED. TRACKING MARKERS DROPPED.";
        }

        selectedCellIndex = selectedCellIndex === index ? null : index;
        
        if (selectedCellIndex !== null && selectedNumber !== null) {
            applyInputToCell(selectedCellIndex, selectedNumber);
        } else {
            renderBoard();
        }
    }

    function applyInputToCell(index, num) {
        if (num === null) return;
        
        if (activeHintIndex === index) {
            clearHintState();
        }

        if (notesMode) {
            cellStates[index].value = 0; 
            const noteArr = cellStates[index].notes;
            if (noteArr.includes(num)) {
                cellStates[index].notes = noteArr.filter(item => item !== num);
            } else {
                noteArr.push(num);
            }
        } else {
            cellStates[index].value = cellStates[index].value === num ? 0 : num;
            cellStates[index].notes = []; 
        }
        renderBoard();
        renderNumpad();
        checkWin();
    }

    function validateBoard() {
        const containers = document.querySelectorAll(".cell-container");
        containers.forEach(c => c.classList.remove("invalid"));

        for (let i = 0; i < 81; i++) {
            const enteredVal = cellStates[i].value;
            
            if (enteredVal === 0 || currentMap[i] !== 0) continue;

            if (enteredVal !== solution[i]) {
                containers[i].classList.add("invalid");
            }
        }
    }

    hintBtn.addEventListener("click", () => {
        if (hintStatePhase === 0) {
            let targetIdx = selectedCellIndex;

            if (targetIdx === null || cellStates[targetIdx].value !== 0) {
                targetIdx = null;
                for (let i = 0; i < 81; i++) {
                    if (cellStates[i].value === 0) {
                        targetIdx = i;
                        break;
                    }
                }
            }

            if (targetIdx === null) {
                statusBox.textContent = ">> MATRIX RECONSTRUCTED COMPLETELY.";
                return;
            }

            activeHintIndex = targetIdx;
            hintStatePhase = 1;

            const row = Math.floor(targetIdx / 9) + 1;
            const col = (targetIdx % 9) + 1;

            statusBox.textContent = `>> ANALYSIS ClUE: Scan Row ${row}, Column ${col}. Focus processing here.`;
            
            hintBtn.textContent = "REVEAL DIGIT";
            hintBtn.style.background = "var(--accent-pink)";
            renderBoard();
        } 
        else if (hintStatePhase === 1) {
            hintStatePhase = 2;
            statusBox.textContent = `>> ANALYSIS PEEK: Target location expects slot value [ ${solution[activeHintIndex]} ].`;
            hintBtn.textContent = "DISMISS CLUE";
            hintBtn.style.background = "#78909c";
            renderBoard();
        } 
        else if (hintStatePhase === 2) {
            clearHintState();
            statusBox.textContent = ">> HOVER RELEASES. RETURNING TO MAIN THREAD.";
            renderBoard();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (selectedCellIndex === null) return;
        if (/^[1-9]$/.test(e.key)) {
            applyInputToCell(selectedCellIndex, parseInt(e.key));
        } else if (e.key === "Backspace" || e.key === "Delete") {
            clearSelectedCell();
        }
    });

    function clearSelectedCell() {
        if (selectedCellIndex === null) return;
        if (activeHintIndex === selectedCellIndex) {
            clearHintState();
        }
        cellStates[selectedCellIndex].value = 0;
        cellStates[selectedCellIndex].notes = [];
        renderBoard();
        renderNumpad();
    }

    notesBtn.addEventListener("click", () => {
        notesMode = !notesMode;
        notesBtn.classList.toggle("active", notesMode);
        notesBtn.textContent = notesMode ? "NOTES: ON" : "NOTES: OFF";
    });

    clearBtn.addEventListener("click", clearSelectedCell);
    newGameBtn.addEventListener("click", initGame);
    diffSelect.addEventListener("change", initGame);

    function checkWin() {
        let win = true;
        for (let i = 0; i < 81; i++) {
            if (cellStates[i].value !== solution[i]) {
                win = false;
                break;
            }
        }
        if (win) {
            clearInterval(timerInterval);
            clearHintState();
            statusBox.textContent = ">> MATRIX VERIFIED. GAME WON.";
            statusBox.style.background = "var(--retro-green)";
        }
    }

    initGame();
});