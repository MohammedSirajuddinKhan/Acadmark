import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const record = {};
        headers.forEach((header, i) => {
            record[header] = values[i] || '';
        });
        return record;
    });
}

const csvPath = path.join(__dirname, 'IMPORT DETAILS', 'students.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parseCSV(csvContent);

console.log('Total records parsed:', records.length);
console.log('\nFirst 5 records:');
records.slice(0, 5).forEach((r, i) => {
    const uniqueId = `${r.Student_ID}_${r.Stream}`;
    console.log(`${i + 1}. ID: ${r.Student_ID}, Stream: ${r.Stream}  => Unique: ${uniqueId}`);
});

console.log('\nLast 5 records:');
records.slice(-5).forEach((r, i) => {
    const uniqueId = `${r.Student_ID}_${r.Stream}`;
    console.log(`${records.length - 4 + i}. ID: ${r.Student_ID}, Stream: ${r.Stream}  => Unique: ${uniqueId}`);
});

// Count by stream
const byStream = {};
records.forEach(r => {
    byStream[r.Stream] = (byStream[r.Stream] || 0) + 1;
});

console.log('\nCounts by stream:');
Object.entries(byStream).forEach(([stream, count]) => {
    console.log(`  ${stream}: ${count}`);
});
