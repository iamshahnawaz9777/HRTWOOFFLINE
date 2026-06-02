const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '..', 'js', 'modules', 'inventory.js');
let content = fs.readFileSync(inventoryPath, 'utf8');

const startMarker = 'function openLogImportStudio(itemId, item, onCompleted) {';
const endMarker = 'function bindTableButtons() {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const replacement = `function openLogImportStudio(itemId, item, onCompleted) {
  let studio = document.getElementById('log-import-studio');
  if (!studio) {
    studio = document.createElement('div');
    studio.id = 'log-import-studio';
    studio.className = 'log-import-studio-overlay';
    document.body.appendChild(studio);
  }
  
  setTimeout(() => studio.classList.add('active'), 20);

  let activeTab = 'new';
  let oldDatabaseLogs = [];
  try {
    const storedOldData = localStorage.getItem('old_inventory_dump');
    if (storedOldData) oldDatabaseLogs = JSON.parse(storedOldData);
  } catch(e) {}

  let stagingLogs = Array(12).fill(null).map(() => ({
    date: '', hardwareName: '', partyName: '', fitterName: '', input: '', output: ''
  }));
  let activeCell = { row: 0, col: 0 };

  const parseAndFormatDate = (rawDate) => {
    if (!rawDate) return SystemDateFormatter.toSystemFormat(new Date());
    rawDate = String(rawDate).trim();
    if (/^\\d{1,2}[-\\/]\\d{1,2}[-\\/]\\d{4}$/.test(rawDate)) {
      const parts = rawDate.replace(/\\//g, '-').split('-');
      return \`\${parts[0].padStart(2, '0')}-\${parts[1].padStart(2, '0')}-\${parts[2]}\`;
    }
    if (/^\\d{4}[-\\/]\\d{1,2}[-\\/]\\d{1,2}$/.test(rawDate)) {
      const parts = rawDate.replace(/\\//g, '-').split('-');
      return \`\${parts[1].padStart(2, '0')}-\${parts[2].padStart(2, '0')}-\${parts[0]}\`;
    }
    return DateEngine.stringify(rawDate) || SystemDateFormatter.toSystemFormat(new Date());
  };

  const colsSafe = (val) => val === undefined || val === null ? '' : String(val).trim();

  const handleXlsxUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedJson = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const formatted = parsedJson.slice(1).map(cells => ({
          date: cells[0] || '',
          hardwareName: String(cells[1] || '').trim().toUpperCase(),
          partyName: String(cells[2] || '').trim(),
          fitterName: String(cells[3] || '').trim(),
          input: cells[4] || '',
          output: cells[5] || ''
        })).filter(i => i.hardwareName || i.date);
        
        stagingLogs = formatted.length > 0 ? formatted : Array(12).fill(null).map(() => ({
          date: '', hardwareName: '', partyName: '', fitterName: '', input: '', output: ''
        }));
        renderStudioContent();
        app.showToast('Excel Upload Map Success', \`Staged \${formatted.length} spreadsheet records successfully.\`, 'success');
      } catch (err) {
        console.error(err);
        app.showToast('Upload Error', 'Failed to read spreadsheet.', 'danger');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePasteFromSheets = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rawData = e.clipboardData.getData('text');
    if (!rawData) return;
    
    const rows = rawData.split(/\\r?\\n/).filter(r => r.trim() !== '');
    const parsedData = rows.map(row => {
      const cells = row.split('\\t');
      return {
        date: colsSafe(cells[0]),
        hardwareName: colsSafe(cells[1]).toUpperCase(),
        partyName: colsSafe(cells[2]),
        fitterName: colsSafe(cells[3]),
        input: cells[4] !== undefined ? colsSafe(cells[4]) : '',
        output: cells[5] !== undefined ? colsSafe(cells[5]) : '',
      };
    });
    
    let dataIndex = 0;
    for (let i = activeCell.row; i < stagingLogs.length && dataIndex < parsedData.length; i++) {
      if (parsedData[dataIndex]) stagingLogs[i] = parsedData[dataIndex];
      dataIndex++;
    }
    while (dataIndex < parsedData.length) {
      stagingLogs.push(parsedData[dataIndex]);
      dataIndex++;
    }
    renderStudioContent();
    app.showToast('Clipboard Import Staging', \`Loaded \${parsedData.length} entries into staging log grid.\`, 'success');
  };

  const handleRawOldDataPaste = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rawText = e.clipboardData.getData('text');
    if (!rawText) return;

    const lines = rawText.split(/\\r?\\n/).filter(line => line.trim() !== '');
    const parsedRawRows = lines.map(line => {
      const cells = line.split('\\t');
      return {
        date: cells[0] || '',
        hardwareName: cells[1] || '',
        partyName: cells[2] || '',
        fitterName: cells[3] || '',
        input: cells[4] || '',
        output: cells[5] || ''
      };
    });

    oldDatabaseLogs = [...oldDatabaseLogs, ...parsedRawRows];
    localStorage.setItem('old_inventory_dump', JSON.stringify(oldDatabaseLogs));
    renderStudioContent();
    app.showToast('Raw Dump Imported', \`Appended \${parsedRawRows.length} raw rows.\`, 'success');
  };

  const clearGridData = () => {
    stagingLogs = Array(12).fill(null).map(() => ({
      date: '', hardwareName: '', partyName: '', fitterName: '', input: '', output: ''
    }));
    activeCell = { row: 0, col: 0 };
    renderStudioContent();
  };

  const clearOldDatabase = () => {
    if (window.confirm("Are you sure you want to clear the old dump table?")) {
      oldDatabaseLogs = [];
      localStorage.removeItem('old_inventory_dump');
      renderStudioContent();
    }
  };

  const renderStudioContent = () => {
    let contentHTML = \`
      <div style="background:#FAFAFA; width:100%; height:100%; display:flex; flex-direction:column; padding:24px; box-sizing:border-box;">
        
        <!-- TAB NAVIGATION -->
        <div style="display:flex; gap:8px; margin-bottom:24px; border-bottom:1px solid #e5e7eb; padding-bottom:12px;">
          <button type="button" class="studio-tab-btn" data-tab="new" style="padding:8px 16px; border-radius:8px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; transition:all 0.2s; cursor:pointer; \${activeTab === 'new' ? 'background:#2563eb; color:white; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:white; color:#4b5563; border:1px solid #e5e7eb;'}">
            ✨ New Database Logs (Smart Tab)
          </button>
          <button type="button" class="studio-tab-btn" data-tab="old" style="padding:8px 16px; border-radius:8px; font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:0.05em; transition:all 0.2s; cursor:pointer; \${activeTab === 'old' ? 'background:#d97706; color:white; border:none; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'background:white; color:#4b5563; border:1px solid #e5e7eb;'}">
            📂 Old Data Dump (Raw Notepad Tab)
          </button>
          <div style="flex-grow:1;"></div>
          <button type="button" id="studio-close-btn" style="background:transparent; border:none; color:#ef4444; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">
            Close Studio
          </button>
        </div>
    \`;

    if (activeTab === 'new') {
      contentHTML += \`
        <div style="background:white; border-radius:12px; border:1px solid #e5e7eb; padding:16px; display:flex; flex-direction:column; flex-grow:1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <div style="margin-bottom:16px; display:flex; justify-content:space-between;">
            <div>
              <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; color:#1f2937; margin:0;">Smart Log System</h1>
              <p style="font-size:11px; color:#9ca3af; margin:4px 0 0 0;">Enforces chronological timeline sorting on new operational store entries.</p>
            </div>
            <div style="display:flex; gap:16px; align-items:center;">
              <label style="display:flex; align-items:center; gap:8px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:12px; font-weight:600; color:#4b5563;">
                📥 Upload .xlsx File
                <input type="file" id="studio-xlsx-upload" accept=".xlsx" style="display:none;" />
              </label>
              <button type="button" id="studio-clear-btn" style="background:transparent; border:none; font-size:12px; color:#6b7280; font-weight:500; cursor:pointer;">
                Reset Sheet
              </button>
            </div>
          </div>
          
          <div class="studio-body custom-spreadsheet-scroll" id="studio-paste-zone" tabindex="0" style="flex-grow:1; background:white; border:1px solid #e5e7eb; border-radius:12px; overflow:auto; outline:none; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
            <table style="width:100%; text-align:left; border-collapse:collapse; table-layout:fixed; font-size:11px;">
              <thead style="background:#F1F3F4; color:#4b5563; position:sticky; top:0; font-weight:normal; text-align:center; z-index:10;">
                <tr style="height:24px; border-bottom:1px solid #d1d5db;">
                  <th style="width:40px; background:#E8EAED; border-right:1px solid #d1d5db;"></th>
                  <th style="width:128px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">A (Date)</th>
                  <th style="width:224px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">B (Hardware Name)</th>
                  <th style="width:176px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">C (Party Name)</th>
                  <th style="width:176px; font-weight:normal; border-right:1px solid #d1d5db; font-size:12px;">D (Fitter Name)</th>
                  <th style="width:96px; font-weight:normal; color:#2563eb; border-right:1px solid #d1d5db; font-size:12px;">E (Input)</th>
                  <th style="width:96px; font-weight:normal; color:#dc2626; border-right:1px solid #d1d5db; font-size:12px;">F (Output)</th>
                  <th style="width:auto; background:#F1F3F4;"></th>
                </tr>
              </thead>
              <tbody>
                \${stagingLogs.map((row, idx) => {
                  const isActive = (col) => activeCell.row === idx && activeCell.col === col;
                  const actSty = 'box-shadow: inset 0 0 0 2px #3b82f6; background-color: rgba(239,246,255,0.5);';
                  return \\\`
                  <tr style="height:28px; border-bottom:1px solid #e5e7eb; transition:background-color 0.15s;" onmouseover="this.style.backgroundColor='rgba(249,250,251,0.4)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="background:#F1F3F4; text-align:center; font-size:10px; color:#9ca3af; font-family:monospace; position:sticky; left:0; border-right:1px solid #d1d5db; user-select:none;">\${idx + 1}</td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(0) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="0">
                      <input type="text" class="studio-row-edit" data-idx="\${idx}" data-field="date" value="\${row.date || ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; font-family:monospace; color:#1f2937;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(1) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="1">
                      <input type="text" class="studio-row-edit uppercase" data-idx="\${idx}" data-field="hardwareName" value="\${row.hardwareName || ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; text-transform:uppercase; font-weight:bold; color:#111827;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(2) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="2">
                      <input type="text" class="studio-row-edit" data-idx="\${idx}" data-field="partyName" value="\${row.partyName || ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#374151;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(3) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="3">
                      <input type="text" class="studio-row-edit" data-idx="\${idx}" data-field="fitterName" value="\${row.fitterName || ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#4b5563;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(4) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="4">
                      <input type="text" class="studio-row-edit" data-idx="\${idx}" data-field="input" value="\${row.input !== '' && row.input !== 0 ? row.input : ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#1d4ed8; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="padding:4px; border-right:1px solid #e5e7eb; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; \${isActive(5) ? actSty : ''}" class="studio-cell" data-row="\${idx}" data-col="5">
                      <input type="text" class="studio-row-edit" data-idx="\${idx}" data-field="output" value="\${row.output !== '' && row.output !== 0 ? row.output : ''}" style="width:100%; height:100%; background:transparent; border:none; outline:none; color:#dc2626; font-weight:bold; text-align:center;" />
                    </td>
                    <td style="background:white;"></td>
                  </tr>
                  \\\`;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="studio-footer" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; background:white; padding:12px; border-radius:12px; border:1px solid #e5e7eb; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <span style="font-size:11px; color:#9ca3af; font-weight:500;">
              Staging Register Status: \${stagingLogs.filter(r => r.date || r.hardwareName || r.partyName).length} active log line elements items parsed.
            </span>
            <button type="button" id="studio-confirm-sync-btn" style="background:#2563eb; color:white; font-weight:bold; font-size:12px; padding:10px 32px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all 0.2s;">
              Commit All Staged Logs to Multi-Database Pipeline
            </button>
          </div>
        </div>
      \`;
    } else {
      contentHTML += \`
        <div style="background:white; border-radius:12px; border:1px solid #e5e7eb; padding:16px; display:flex; flex-direction:column; flex-grow:1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <div style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h1 style="font-size:14px; font-weight:900; text-transform:uppercase; color:#92400e; margin:0;">Old Data Raw Dump Studio</h1>
              <p style="font-size:11px; color:#9ca3af; margin:4px 0 0 0;">Click anywhere inside the gray workspace area below and press <b>Ctrl + V</b> to instantly dump raw data. Absolutely no date checking or sorting rules applied.</p>
            </div>
            <button type="button" id="old-data-clear-btn" style="background:#fef2f2; border:none; color:#dc2626; font-size:10px; font-weight:bold; text-transform:uppercase; padding:6px 12px; border-radius:4px; cursor:pointer;">
              Clear Dump History
            </button>
          </div>
          
          <div id="old-data-paste-zone" tabindex="0" style="width:100%; height:128px; background:#f9fafb; border:2px dashed #d1d5db; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; text-align:center; cursor:pointer; outline:none; transition:all 0.2s; margin-bottom:24px;">
            <span style="font-size:24px; margin-bottom:8px;">📋</span>
            <span style="font-size:12px; font-weight:bold; color:#374151;">Click here and press Ctrl + V to Paste Raw Excel Sequence</span>
            <span style="font-size:10px; color:#9ca3af; margin-top:2px;">Dates, spaces, and formats are taken exactly as they are.</span>
          </div>

          <div style="flex-grow:1; overflow-y:auto; border:1px solid #e5e7eb; border-radius:12px; max-height:400px;">
            <table style="width:100%; text-align:left; border-collapse:collapse; font-size:11px;">
              <thead style="background:#92400e; color:white; position:sticky; top:0; z-index:10;">
                <tr>
                  <th style="padding:10px; text-align:center; width:48px;">SNo</th>
                  <th style="padding:10px; width:128px;">Raw Date String</th>
                  <th style="padding:10px;">Hardware Name</th>
                  <th style="padding:10px;">Party Name</th>
                  <th style="padding:10px;">Fitter / Helper</th>
                  <th style="padding:10px; text-align:center; width:96px;">Input</th>
                  <th style="padding:10px; text-align:center; width:96px;">Output</th>
                </tr>
              </thead>
              <tbody style="font-family:monospace; color:#374151;">
                \${oldDatabaseLogs.length === 0 ? \`
                  <tr>
                    <td colspan="7" style="padding:40px; text-align:center; color:#9ca3af; font-weight:bold; text-transform:uppercase; font-size:12px;">
                      Old archive workspace is empty. Click above and paste to dump historical records.
                    </td>
                  </tr>
                \` : oldDatabaseLogs.map((row, idx) => \`
                  <tr style="border-bottom:1px solid #e5e7eb; height:28px;">
                    <td style="padding:8px; text-align:center; color:#9ca3af; background:#f9fafb;">\${idx + 1}</td>
                    <td style="padding:8px; font-weight:bold; color:#78350f; background:#fffbeb;">\${row.date}</td>
                    <td style="padding:8px; text-transform:uppercase; font-family:sans-serif; color:black;">\${row.hardwareName}</td>
                    <td style="padding:8px; font-family:sans-serif;">\${row.partyName}</td>
                    <td style="padding:8px; font-family:sans-serif;">\${row.fitterName}</td>
                    <td style="padding:8px; text-align:center; color:#2563eb; font-weight:bold;">\${row.input}</td>
                    <td style="padding:8px; text-align:center; color:#dc2626; font-weight:bold;">\${row.output}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      \`;
    }

    contentHTML += \`</div>\`;
    studio.innerHTML = contentHTML;
    bindStudioEvents();
  };

  const bindStudioEvents = () => {
    // Tab switching
    studio.querySelectorAll('.studio-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        activeTab = e.target.getAttribute('data-tab');
        renderStudioContent();
      });
    });

    document.getElementById('studio-close-btn')?.addEventListener('click', () => {
      studio.classList.remove('active');
      setTimeout(() => studio.remove(), 300);
    });

    if (activeTab === 'new') {
      const pasteZone = document.getElementById('studio-paste-zone');
      if (pasteZone) pasteZone.focus();

      const uploader = document.getElementById('studio-xlsx-upload');
      uploader?.addEventListener('change', handleXlsxUpload);
      
      pasteZone?.addEventListener('paste', handlePasteFromSheets);
      document.getElementById('studio-clear-btn')?.addEventListener('click', clearGridData);
      
      studio.querySelectorAll('.studio-cell').forEach(cell => {
        cell.addEventListener('mousedown', (e) => {
          const row = parseInt(cell.getAttribute('data-row'));
          const col = parseInt(cell.getAttribute('data-col'));
          if (activeCell.row !== row || activeCell.col !== col) {
            activeCell = { row, col };
            renderStudioContent();
          }
        });
      });

      // Data Binding without formatting interference! 
      studio.querySelectorAll('.studio-row-edit').forEach(input => {
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.getAttribute('data-idx'));
          const field = e.target.getAttribute('data-field');
          let val = e.target.value;
          // IMPORTANT FIX: take string exactly as it is for dates, no stripping.
          if (stagingLogs[idx]) stagingLogs[idx][field] = val;
        });
      });
      
      document.getElementById('studio-confirm-sync-btn')?.addEventListener('click', async () => {
        const realPayload = stagingLogs.filter(row => row.date || row.hardwareName || row.partyName);
        if (realPayload.length === 0) {
          app.showToast('Empty Staging', 'Spreadsheet staging space contains no data to record!', 'warning');
          return;
        }
        
        let successCount = 0;
        for (let i = 0; i < realPayload.length; i++) {
          const row = realPayload[i];
          const hardwareName = row.hardwareName;
          const partyName = row.partyName;
          const fitterName = row.fitterName;
          
          const input = parseInt(row.input) || 0;
          const output = parseInt(row.output) || 0;
          const quantity = input > 0 ? input : (output > 0 ? output : 0);
          if (quantity <= 0) continue;
          
          let formattedDate = row.date;
          if (!formattedDate) {
             formattedDate = SystemDateFormatter.toSystemFormat(new Date());
          } else {
             // Basic format check if needed, else raw
             formattedDate = parseAndFormatDate(formattedDate);
          }
          
          const type = input > 0 ? 'inward' : 'outward';
          const txId = \`tx-\${Date.now()}-\${i}-\${Math.floor(Math.random() * 1000)}\`;
          const txRecord = {
            id: txId, itemId, type, quantity, date: formattedDate,
            sourceOrPurpose: 'Log Import Studio', hardwareName, partyName, fitterName
          };
          
          await db.put('transactions', txRecord);
          await sync.queueOperation('transactions', 'insert', txRecord);
          successCount++;
        }
        
        if (successCount > 0) {
          app.showToast('Import Studio Sync Complete', \`Successfully committed \${successCount} transactions to Triple-Sync!\`, 'success');
          clearGridData();
          studio.classList.remove('active');
          setTimeout(() => studio.remove(), 300);
          if (onCompleted) await onCompleted();
        } else {
          app.showToast('Staging Sync Failure', 'No valid log rows with quantities detected.', 'danger');
        }
      });
    } else if (activeTab === 'old') {
      const oldZone = document.getElementById('old-data-paste-zone');
      if (oldZone) {
        oldZone.focus();
        oldZone.addEventListener('paste', handleRawOldDataPaste);
      }
      document.getElementById('old-data-clear-btn')?.addEventListener('click', clearOldDatabase);
    }
  };

  renderStudioContent();
}
`;

const newContent = content.substring(0, startIndex) + replacement + '\n' + content.substring(endIndex);
fs.writeFileSync(inventoryPath, newContent);
console.log("Done");
