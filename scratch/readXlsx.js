const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Classeur1.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Sheets found:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        headers.push(cell ? cell.v : undefined);
    }
    console.log(`Sheet "${sheetName}" headers:`, headers.filter(h => h !== undefined));
});
